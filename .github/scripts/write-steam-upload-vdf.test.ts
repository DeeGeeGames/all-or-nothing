import { describe, expect, test } from 'bun:test';
import { createSteamUploadVdfs } from './write-steam-upload-vdf.mjs';

const options = {
	appId: '4537590',
	description: 'v1.18.3',
	contentRoot: '/tmp/builds',
	buildOutput: '/tmp/output',
	vdfDir: '/tmp/vdf',
	windowsDepotPath: 'windows',
	linuxDepotPath: 'linux',
	linuxInstallScript: 'steam/install_script_linux.vdf',
};

describe('createSteamUploadVdfs', () => {
	test('omits setlive and points both depots at the vdf directory', () => {
		const files = createSteamUploadVdfs(options);

		expect(files.manifest).not.toContain('setlive');
		expect(files.manifest).toContain('"appid" "4537590"');
		expect(files.manifest).toContain('"desc" "v1.18.3"');
		expect(files.manifest).toContain('"contentroot" "/tmp/builds"');
		expect(files.manifest).toContain('"4537591" "/tmp/vdf/depot4537591.vdf"');
		expect(files.manifest).toContain('"4537592" "/tmp/vdf/depot4537592.vdf"');
		expect(files.depots['depot4537591.vdf']).toContain('"LocalPath" "./windows/*"');
		expect(files.depots['depot4537591.vdf']).not.toContain('InstallScript');
		expect(files.depots['depot4537592.vdf']).toContain('"LocalPath" "./linux/*"');
		expect(files.depots['depot4537592.vdf']).toContain('"InstallScript" "steam/install_script_linux.vdf"');
	});

	test('rejects a description that can break the manifest', () => {
		expect(function() {
			createSteamUploadVdfs({ ...options, description: 'v1 "live"' });
		}).toThrow(/description/);
	});
});
