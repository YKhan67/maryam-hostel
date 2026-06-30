// src/pages/LandingPage.js
import React from "react";
import { useNavigate } from "react-router-dom";

// Logo & photos – make sure these files exist in src/assets/
import logoImg from "../assets/maryam_logo.png";
import heroImg from "../assets/hostel_hero.jpg";
import roomImg from "../assets/hostel_room.jpg";
import lifeImg from "../assets/hostel_life.jpg";
import breakfastImg from "../assets/breakfast_menu.jpg";
import lunchImg from "../assets/lunch_menu.jpg";
import dinnerImg from "../assets/dinner_menu.jpg";

/**
 * Vibrant public landing page for Maryam Girls Hostel
 * URL: /
 */
export default function LandingPage() {
  const navigate = useNavigate();

  const pageStyle = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #ffe0f0 0, #f9fafb 40%, #eef2ff 100%)",
    color: "#111827",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: "flex",
    flexDirection: "column",
  };

  const headerStyle = {
    position: "sticky",
    top: 0,
    zIndex: 30,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 40px",
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #e5e7eb",
  };

  const logoWrapStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const navStyle = {
    display: "flex",
    gap: 18,
    fontSize: 14,
    color: "#4b5563",
  };

  const navLinkStyle = {
    textDecoration: "none",
    color: "#6b7280",
    fontWeight: 500,
  };

  const loginBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    padding: "6px 16px",
    cursor: "pointer",
    background: "#ffffff",
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
  };

  const mainStyle = {
    flex: 1,
    padding: "26px 40px 34px",
    display: "flex",
    flexDirection: "column",
    gap: 36,
  };

  const heroStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 1.4fr)",
    gap: 26,
    alignItems: "center",
  };

  const heroImageWrap = {
    position: "relative",
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 20px 45px rgba(15,23,42,0.16)",
    border: "1px solid #e5e7eb",
  };

  const heroOverlayCard = {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    background: "rgba(17,24,39,0.78)",
    color: "#f9fafb",
    borderRadius: 18,
    padding: 12,
    fontSize: 12,
  };

  const sectionCards = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  };

  const miniCard = {
    background: "#ffffff",
    borderRadius: 18,
    padding: 14,
    border: "1px solid #e5e7eb",
    fontSize: 13,
    color: "#4b5563",
    boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
  };

  const galleryStrip = {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
  };

  const galleryCard = {
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    background: "#fff",
    boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
    fontSize: 11,
    color: "#4b5563",
  };

  const footerStyle = {
    padding: "12px 40px 16px",
    fontSize: 12,
    color: "#6b7280",
    borderTop: "1px solid #e5e7eb",
    background: "rgba(255,255,255,0.95)",
    textAlign: "center",
  };

  return (
    <div style={pageStyle}>
      {/* HEADER */}
      <header style={headerStyle}>
        <div style={logoWrapStyle}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#fff",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={logoImg}
              alt="Maryam Hostel Logo"
              style={{ width: "90%", height: "90%", objectFit: "contain" }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Maryam Girls Hostel
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Near NUST Gate 4 • H-13 Islamabad
            </div>
          </div>
        </div>

        {/* Simple nav + login */}
        <nav style={navStyle} className="mh-nav-desktop">
          <a href="#about" style={navLinkStyle}>
            About
          </a>
          <a href="#facilities" style={navLinkStyle}>
            Facilities
          </a>
          <a href="#meals" style={navLinkStyle}>
            Meals
          </a>
          <a href="#location" style={navLinkStyle}>
            Location
          </a>
          <a href="#testimonials" style={navLinkStyle}>
            Testimonials
          </a>
          <a href="#instagram" style={navLinkStyle}>
            Instagram
          </a>
        </nav>

        <button
          type="button"
          onClick={() => navigate("/login")}
          style={loginBtnStyle}
        >
          <span style={{ fontSize: 16 }}>👤</span>
          <span>Login</span>
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main style={mainStyle}>
        {/* HERO SECTION */}
        <section style={heroStyle}>
          {/* Left: text + CTAs */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 12px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, #fee2f2, #e0f2fe, #fef3c7)",
                border: "1px solid rgba(236,72,153,0.25)",
                fontSize: 11,
                color: "#9f1239",
                marginBottom: 8,
              }}
            >
              Homely hostel for female students • New admissions open
            </div>

            <h1
              style={{
                fontSize: 34,
                lineHeight: 1.25,
                margin: 0,
                marginBottom: 8,
              }}
            >
              Study in{" "}
              <span style={{ color: "#db2777", fontWeight: 800 }}>peace</span>,{" "}
              live with{" "}
              <span style={{ color: "#7c3aed", fontWeight: 800 }}>comfort</span>
              .
            </h1>

            <p
              style={{
                fontSize: 14,
                color: "#4b5563",
                maxWidth: 540,
                marginBottom: 16,
              }}
            >
              Maryam Girls Hostel in H-13 (near NUST Gate 4) offers cozy rooms,
              home-cooked meals and a calm, safe environment so you can focus
              on your grades and goals with a homely feel.
            </p>

            {/* CTAs with your REAL WhatsApp & phone */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="https://wa.me/923312754995"
                className="btn btn-primary"
                style={{
                  paddingInline: 20,
                  fontSize: 13,
                  boxShadow: "0 10px 28px rgba(22,163,74,0.35)",
                  background:
                    "linear-gradient(135deg, #22c55e, #16a34a, #15803d)",
                  border: "none",
                }}
              >
                WhatsApp: +92 331 2754995
              </a>

              <a
                href="tel:+923312754995"
                className="btn btn-outline-secondary"
                style={{
                  paddingInline: 20,
                  fontSize: 13,
                }}
              >
                Call Hostel Management
              </a>
            </div>

            <p
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 10,
              }}
            >
              Limited beds available • First come, first served • Parents welcome
              to visit.
            </p>
          </div>

          {/* Right: big hero image with overlay */}
          <div style={heroImageWrap}>
            <img
              src={heroImg}
              alt="Maryam Hostel – main view"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={heroOverlayCard}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Life at Maryam Girls Hostel
              </div>
              <div>
                📍 H-13, near NUST Gate 4 • 🍱 Home-cooked meals • 👭 All-girls
                safe community
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT + FACILITIES SUMMARY */}
        <section id="about">
          <h2
            style={{
              fontSize: 22,
              marginBottom: 6,
            }}
          >
            A homely hostel for university girls in Islamabad
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              margin: 0,
              marginBottom: 12,
              maxWidth: 620,
            }}
          >
            Located in H-13 close to NUST and other universities, Maryam Girls
            Hostel is designed to feel like a home – not just a bed. It&apos;s
            a calm, respectful environment where students can live, study and
            grow together.
          </p>

          <div style={sectionCards}>
            <div style={miniCard}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Prime Student Location
              </h3>
              <p style={{ margin: 0 }}>
                Short distance from NUST Gate 4 and other institutes in H-13.
                Easy access to campus, food spots and basic shopping.
              </p>
            </div>
            <div style={miniCard}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Safe All-Girls Environment
              </h3>
              <p style={{ margin: 0 }}>
                Comfortable, respectful atmosphere so students and parents feel
                secure and at ease.
              </p>
            </div>
            <div style={miniCard}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Calm & Study-Friendly
              </h3>
              <p style={{ margin: 0 }}>
                Quiet environment that supports exam preparation, online
                classes and late-night study sessions.
              </p>
            </div>
          </div>
        </section>

        {/* FACILITIES WITH ROOM PHOTO */}
        <section id="facilities">
          <h2
            style={{
              fontSize: 20,
              marginBottom: 6,
            }}
          >
            Facilities & comfort
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              margin: 0,
              marginBottom: 10,
            }}
          >
            Essentials that matter in day-to-day hostel life – cleanliness,
            comfort, and convenience.
          </p>

          <div style={sectionCards}>
            {/* Room card with image */}
            <div style={miniCard}>
              <div
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 8,
                  height: 120,
                }}
              >
                <img
                  src={roomImg}
                  alt="Hostel room"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Cozy Rooms
              </h3>
              <p style={{ margin: 0 }}>
                Comfortable furnished rooms so you can rest properly and study
                with focus.
              </p>
            </div>

            {/* Study / WiFi card */}
            <div style={miniCard}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Study-Friendly Setup
              </h3>
              <p style={{ margin: 0 }}>
                Calm environment, Wi-Fi and shared spaces that support
                assignments, online classes and group study.
              </p>
              <ul
                style={{
                  margin: 6,
                  paddingLeft: 18,
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                <li>High-speed internet</li>
                <li>Comfortable seating</li>
                <li>Lighting suitable for study</li>
              </ul>
            </div>

            {/* Housekeeping card */}
            <div style={miniCard}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Regular Cleaning
              </h3>
              <p style={{ margin: 0 }}>
                Rooms and common areas are kept neat so students can focus on
                their degree, not dusting.
              </p>
            </div>
          </div>
        </section>

        {/* MEALS SECTION WITH BREAKFAST / LUNCH / DINNER */}
        <section id="meals">
          <h2
            style={{
              fontSize: 20,
              marginBottom: 6,
            }}
          >
            Breakfast, lunch & dinner – hostel style
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              margin: 0,
              marginBottom: 10,
            }}
          >
            Simple, comforting menus that look just like your Instagram posts –
            a proper start, middle and end to the day.
          </p>

          <div style={sectionCards}>
            {/* Breakfast */}
            <div style={miniCard}>
              <div
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 8,
                  height: 120,
                }}
              >
                <img
                  src={breakfastImg}
                  alt="Breakfast menu"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Breakfast
              </h3>
              <p style={{ margin: 0 }}>
                A simple, energizing start to the day so students don&apos;t
                rush to class on an empty stomach.
              </p>
            </div>

            {/* Lunch */}
            <div style={miniCard}>
              <div
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 8,
                  height: 120,
                }}
              >
                <img
                  src={lunchImg}
                  alt="Lunch menu"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Lunch
              </h3>
              <p style={{ margin: 0 }}>
                Home-style lunch that feels like a proper meal, not just a quick
                snack between classes.
              </p>
            </div>

            {/* Dinner */}
            <div style={miniCard}>
              <div
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 8,
                  height: 120,
                }}
              >
                <img
                  src={dinnerImg}
                  alt="Dinner menu"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Dinner
              </h3>
              <p style={{ margin: 0 }}>
                A calm end to the day with a comforting dinner, shared with
                other hostel-mates.
              </p>
            </div>
          </div>
        </section>

        {/* LOCATION */}
        <section id="location">
          <h2
            style={{
              fontSize: 20,
              marginBottom: 6,
            }}
          >
            Location – H-13, near NUST Gate 4
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              margin: 0,
            }}
          >
            Close to NUST and other universities in H-13, with easy access to
            public transport and everyday essentials.
          </p>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 13, color: "#4b5563" }}>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  lineHeight: 1.7,
                }}
              >
                <li>🚶 Short distance to NUST Gate 4.</li>
                <li>🛒 Grocery & basic shops nearby.</li>
                <li>🕌 Access to nearby mosques and community spaces.</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                Parents can easily visit, drop students and check the
                environment in person.
              </p>
            </div>

            <div
              style={{
                ...miniCard,
                background:
                  "linear-gradient(135deg, #fef3c7, #f5d0fe, #e0f2fe)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#7c2d12",
                  marginBottom: 4,
                }}
              >
                Maps & directions
              </div>
              {/* TODO: replace with your real Google Maps link */}
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#7c3aed",
                  textDecoration: "none",
                }}
              >
                View approximate location on Google Maps
              </a>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#4b5563",
                }}
              >
                For the exact pin & visit timing, please message us on WhatsApp
                or call.
              </p>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials">
          <h2
            style={{
              fontSize: 20,
              marginBottom: 6,
            }}
          >
            What students & parents say
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginTop: 0,
              marginBottom: 10,
            }}
          >
            Short comments inspired by CSP, medical and NUST students who prefer
            a calm, homely hostel.
          </p>

          <div style={sectionCards}>
            <div style={miniCard}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#db2777",
                  marginBottom: 4,
                }}
              >
                CSP Aspirant
              </div>
              <p style={{ margin: 0, fontSize: 13 }}>
                “I needed a quiet place for serious study. Maryam Hostel is
                peaceful and disciplined – it feels like a home library with a
                bed.”
              </p>
            </div>

            <div style={miniCard}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#2563eb",
                  marginBottom: 4,
                }}
              >
                Medical Student
              </div>
              <p style={{ margin: 0, fontSize: 13 }}>
                “Long ward duties and exams are tough. Coming back to a clean
                room and simple home-cooked food makes a big difference.”
              </p>
            </div>

            <div style={miniCard}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#16a34a",
                  marginBottom: 4,
                }}
              >
                NUST Student
              </div>
              <p style={{ margin: 0, fontSize: 13 }}>
                “It&apos;s very convenient for NUST. I can walk to class and my
                parents are relaxed knowing it&apos;s an all-girls environment.”
              </p>
            </div>
          </div>
        </section>

        {/* INSTAGRAM STRIP */}
        <section id="instagram">
          <h2
            style={{
              fontSize: 20,
              marginBottom: 6,
            }}
          >
            Latest from Instagram
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            Peek into hostel life, meals and the day-to-day atmosphere at Maryam
            Girls Hostel.
          </p>

          <div style={galleryStrip}>
            {/* Card 1 – hostel life */}
            <a
              href="https://www.instagram.com/maryam.hostel/"
              target="_blank"
              rel="noreferrer"
              style={galleryCard}
            >
              <div style={{ height: 120, overflow: "hidden" }}>
                <img
                  src={lifeImg}
                  alt="Hostel life"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ padding: "6px 8px" }}>
                Hostel life • common moments
              </div>
            </a>

            {/* Card 2 – lunch or dinner */}
            <a
              href="https://www.instagram.com/maryam.hostel/"
              target="_blank"
              rel="noreferrer"
              style={galleryCard}
            >
              <div style={{ height: 120, overflow: "hidden" }}>
                <img
                  src={lunchImg}
                  alt="Lunch at hostel"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ padding: "6px 8px" }}>Home-cooked lunch</div>
            </a>

            {/* Card 3 – dinner */}
            <a
              href="https://www.instagram.com/maryam.hostel/"
              target="_blank"
              rel="noreferrer"
              style={galleryCard}
            >
              <div style={{ height: 120, overflow: "hidden" }}>
                <img
                  src={dinnerImg}
                  alt="Dinner at hostel"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ padding: "6px 8px" }}>Dinner vibes</div>
            </a>
          </div>

          <p
            style={{
              fontSize: 13,
              marginTop: 10,
            }}
          >
            Follow us on Instagram:{" "}
            <a
              href="https://www.instagram.com/maryam.hostel/"
              target="_blank"
              rel="noreferrer"
              style={{
                fontWeight: 600,
                color: "#db2777",
                textDecoration: "none",
              }}
            >
              @maryam.hostel
            </a>
          </p>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={footerStyle}>
        <div>© {new Date().getFullYear()} Maryam Girls Hostel, Islamabad</div>
        <div>Homely hostel near NUST H-13 • WhatsApp: +92 331 2754995</div>
      </footer>
    </div>
  );
}
