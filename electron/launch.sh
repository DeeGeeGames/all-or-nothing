#!/bin/sh
cd "$(dirname "$0")"

set -- --no-sandbox

# Force X11 on nvidia GPUs to work around Wayland/Ozone rendering issues.
if [ -d /proc/driver/nvidia ]; then
	set -- "$@" --ozone-platform=x11
fi

exec ./all-or-nothing-game "$@"
