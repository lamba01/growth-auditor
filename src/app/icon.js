import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#17433a",
        borderRadius: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f2f4f1"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 14 4-4" />
        <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      </svg>
    </div>,
    size,
  );
}
