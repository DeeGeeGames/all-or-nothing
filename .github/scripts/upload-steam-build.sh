#!/usr/bin/env bash
# Upload a Steam build without SetLive. The default branch of a released app
# has to be set live from Steamworks, where the build account confirms it.
set -euo pipefail

: "${STEAM_USERNAME:?STEAM_USERNAME is required}"
: "${STEAM_CONFIG_VDF:?STEAM_CONFIG_VDF is required}"
: "${STEAM_APP_ID:?STEAM_APP_ID is required}"
: "${BUILD_DESCRIPTION:?BUILD_DESCRIPTION is required}"

root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"

work_root="${RUNNER_TEMP:-/tmp}"
vdf_dir="$work_root/steam-upload-vdf"
build_output="$work_root/steam-upload-output"
steamcmd_dir="$work_root/steamcmd"
steam_home="$work_root/steam-home"
mkdir -p "$vdf_dir" "$build_output" "$steamcmd_dir" "$steam_home/Steam/config" "$steam_home/.steam"

content_root="$(cd builds && pwd)"
node "$root/.github/scripts/write-steam-upload-vdf.mjs" \
	--app-id "$STEAM_APP_ID" \
	--description "$BUILD_DESCRIPTION" \
	--content-root "$content_root" \
	--build-output "$build_output" \
	--vdf-dir "$vdf_dir" \
	--linux-install-script "steam/install_script_linux.vdf"

if grep -q 'setlive' "$vdf_dir/manifest.vdf"; then
	echo "Refusing to upload a manifest that sets a branch live." >&2
	exit 1
fi

echo "Steam upload manifest:"
cat "$vdf_dir/manifest.vdf"
echo "Windows depot:"
cat "$vdf_dir"/depot*.vdf

if [[ ! -e /lib/ld-linux.so.2 ]]; then
	sudo dpkg --add-architecture i386
	sudo apt-get update
	sudo apt-get install -y --no-install-recommends libc6:i386 lib32gcc-s1 libstdc++6:i386
fi

if [[ ! -x "$steamcmd_dir/steamcmd.sh" ]]; then
	curl -fsSL "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz" -o "$steamcmd_dir/steamcmd.tar.gz"
	tar -xzf "$steamcmd_dir/steamcmd.tar.gz" -C "$steamcmd_dir"
fi

printf '%s' "$STEAM_CONFIG_VDF" | base64 -d > "$steam_home/Steam/config/config.vdf"
chmod 600 "$steam_home/Steam/config/config.vdf"

export HOME="$steam_home"
"$steamcmd_dir/steamcmd.sh" +set_steam_guard_code INVALID +login "$STEAM_USERNAME" +quit
"$steamcmd_dir/steamcmd.sh" +login "$STEAM_USERNAME" +run_app_build "$vdf_dir/manifest.vdf" +quit

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
	cat >> "$GITHUB_STEP_SUMMARY" <<EOF
Steam build \`$BUILD_DESCRIPTION\` was uploaded without setting a branch live.

Set that build live on the default branch in Steamworks. steamcmd cannot complete that step for a released app. The build account confirms it in the Steam Mobile app or by SMS.
EOF
fi
