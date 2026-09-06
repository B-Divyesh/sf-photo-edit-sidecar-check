const sourceXmp = `<?xpacket begin=""?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/" xmp:Rating="4" exif:DateTimeOriginal="2025-05-04T21:12:11Z" crs:Exposure2012="+0.55" crs:CropTop="0.08">
      <dc:subject><rdf:Bag><rdf:li>night</rdf:li><rdf:li>Lisbon</rdf:li><rdf:li>portfolio</rdf:li></rdf:Bag></dc:subject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;

const handoffXmp = `<?xpacket begin=""?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmp:Rating="4" exif:DateTimeOriginal="2025-05-04T21:12:11Z">
      <dc:subject><rdf:Bag><rdf:li>portfolio</rdf:li><rdf:li>Lisbon</rdf:li><rdf:li>night</rdf:li></rdf:Bag></dc:subject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;

const tinyJpegBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=';

function decodeBase64(value: string): ArrayBuffer {
  const decoded = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes.buffer;
}

export function sampleFiles(): { source: File[]; handoff: File[] } {
  const modified = Date.UTC(2025, 4, 5, 8, 30);
  return {
    source: [
      new File([new Uint8Array(new ArrayBuffer(10)).map((_, index) => [0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 0, 0][index])], 'Lisbon-Night-042.dng', { type: 'image/x-adobe-dng', lastModified: modified }),
      new File([sourceXmp], 'Lisbon-Night-042.xmp', { type: 'application/rdf+xml', lastModified: modified }),
    ],
    handoff: [
      new File([decodeBase64(tinyJpegBase64)], 'Lisbon-Night-042-print.jpg', { type: 'image/jpeg', lastModified: modified }),
      new File([handoffXmp], 'Lisbon-Night-042-print.xmp', { type: 'application/rdf+xml', lastModified: modified }),
    ],
  };
}
