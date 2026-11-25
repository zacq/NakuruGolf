import QRCode from "qrcode";

export async function QrSvg({ value, size = 180 }: { value: string; size?: number }) {
  const svg = await QRCode.toString(value, { type: "svg", margin: 1, width: size, color: { dark: "#0a2c1e", light: "#ffffff" } });
  return <div role="img" aria-label={`QR code ${value}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
