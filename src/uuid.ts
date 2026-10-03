/** UUID v4 using the random API available on both HTTP LAN and HTTPS origins. */
export
function createUuid(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	const hex = Array.from(bytes, function(byte, index) {
		if (index === 6) return ((byte & 0x0f) | 0x40).toString(16).padStart(2, '0');
		if (index === 8) return ((byte & 0x3f) | 0x80).toString(16).padStart(2, '0');
		return byte.toString(16).padStart(2, '0');
	}).join('');

	return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}
