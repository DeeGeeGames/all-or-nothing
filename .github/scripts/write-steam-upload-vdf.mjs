import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE_EXCLUSIONS = [
	'*.pdb',
	'**/*_BurstDebugInformation_DoNotShip*',
	'**/*_BackUpThisFolder_ButDontShipItWithYourGame*',
];

const assertPlainToken = function(value, label) {
	if (typeof value !== 'string' || value.length === 0 || /["\\\r\n]/.test(value)) {
		throw new Error(`${label} must be a non-empty string without quotes or newlines`);
	}
};

const assertAppId = function(appId) {
	if (!/^\d+$/.test(appId)) {
		throw new Error('appId must be a decimal Steam app id');
	}
};

const depotVdf = function(depotId, localPath, installScript) {
	const exclusions = FILE_EXCLUSIONS.map(function(pattern) {
		return `  "FileExclusion" "${pattern}"`;
	}).join('\n');
	const installLine = installScript === undefined ? '' : `\n  "InstallScript" "${installScript}"`;
	return [
		'"DepotBuildConfig"',
		'{',
		`  "DepotID" "${depotId}"`,
		'  "FileMapping"',
		'  {',
		`    "LocalPath" "./${localPath}/*"`,
		'    "DepotPath" "."',
		'    "recursive" "1"',
		'  }',
		exclusions + installLine,
		'}',
		'',
	].join('\n');
};

// Tag uploads must omit setlive. steamcmd cannot set the default branch live
// on a released app, and an empty setlive value is Steam's name for that branch.
export const createSteamUploadVdfs = function(options) {
	assertAppId(options.appId);
	assertPlainToken(options.description, 'description');
	assertPlainToken(options.contentRoot, 'contentRoot');
	assertPlainToken(options.buildOutput, 'buildOutput');
	assertPlainToken(options.windowsDepotPath, 'windowsDepotPath');
	assertPlainToken(options.linuxDepotPath, 'linuxDepotPath');
	assertPlainToken(options.vdfDir, 'vdfDir');
	if (options.linuxInstallScript !== undefined) {
		assertPlainToken(options.linuxInstallScript, 'linuxInstallScript');
	}

	const windowsDepotId = String(Number(options.appId) + 1);
	const linuxDepotId = String(Number(options.appId) + 2);
	const windowsFile = `depot${windowsDepotId}.vdf`;
	const linuxFile = `depot${linuxDepotId}.vdf`;
	const manifest = [
		'"appbuild"',
		'{',
		`  "appid" "${options.appId}"`,
		`  "desc" "${options.description}"`,
		`  "buildoutput" "${options.buildOutput}"`,
		`  "contentroot" "${options.contentRoot}"`,
		'  "depots"',
		'  {',
		`    "${windowsDepotId}" "${join(options.vdfDir, windowsFile)}"`,
		`    "${linuxDepotId}" "${join(options.vdfDir, linuxFile)}"`,
		'  }',
		'}',
		'',
	].join('\n');
	if (manifest.includes('setlive')) {
		throw new Error('upload manifest must not set a branch live');
	}

	return {
		manifest,
		depots: {
			[windowsFile]: depotVdf(windowsDepotId, options.windowsDepotPath),
			[linuxFile]: depotVdf(linuxDepotId, options.linuxDepotPath, options.linuxInstallScript),
		},
	};
};

const readOption = function(args, name) {
	const index = args.indexOf(name);
	const value = index === -1 ? undefined : args[index + 1];
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`Missing ${name}`);
	}
	return value;
};

const isCli = process.argv[1]?.endsWith('write-steam-upload-vdf.mjs') === true;

if (isCli) {
	const args = process.argv.slice(2);
	const vdfDir = readOption(args, '--vdf-dir');
	const files = createSteamUploadVdfs({
		appId: readOption(args, '--app-id'),
		description: readOption(args, '--description'),
		contentRoot: readOption(args, '--content-root'),
		buildOutput: readOption(args, '--build-output'),
		vdfDir,
		windowsDepotPath: 'windows',
		linuxDepotPath: 'linux',
		linuxInstallScript: readOption(args, '--linux-install-script'),
	});
	mkdirSync(vdfDir, { recursive: true });
	writeFileSync(join(vdfDir, 'manifest.vdf'), files.manifest);
	for (const [name, contents] of Object.entries(files.depots)) {
		writeFileSync(join(vdfDir, name), contents);
	}
	process.stdout.write(`${join(vdfDir, 'manifest.vdf')}\n`);
}
