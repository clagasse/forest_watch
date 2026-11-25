import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "BC Forestry Watch — Proposed Logging & Standing Forest Explorer";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F7F4EC",
          color: "#11241C",
          padding: "64px 72px",
          border: "16px solid #143929",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#1D523B",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              backgroundColor: "#276E4F",
            }}
          />
          <span>Live Provincial Forestry Atlas · British Columbia</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.08,
              color: "#11241C",
            }}
          >
            BC Forestry Watch
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              color: "#44403C",
            }}
          >
            Proposed Logging, Standing Old Growth &amp; 30-Day Public Comments
            Across BC
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          {[
            "8 Official Regions",
            "Pre-Assessed Proposals",
            "Open Government Data",
          ].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 22px",
                borderRadius: 9999,
                backgroundColor: "#143929",
                color: "#F7F4EC",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
