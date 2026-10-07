"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const mainMachine = {
  name: "Power Tiller",
  category: "AGRICULTURAL MACHINERY",
  image:
    "https://hardwarepasal.com/src/img/product//2026-05-17-12-49-15_zUSikssJj6product.jpg",
};

const supportingMachines = [
  {
    name: "Corn Sheller",
    category: "AGRICULTURAL",
    image: "https://krishibajar.com/assets/products/maxresdefault.jpg",
    position: "machine-card-left",
  },
  {
    name: "Self Propelled Reaper",
    category: "HARVESTING",
    image:
      "https://nthagrizone.com/media/equipment/images/Self_Propelled_Reaper.png",
    position: "machine-card-right",
  },
  {
    name: "Cordless Tool Kit",
    category: "POWER TOOLS",
    image:
      "https://hardwarepasal.com/src/img/product//2024-08-19-11-40-56_HOodVrQ27zproduct.webp",
    position: "machine-card-bottom",
  },
];

export default function MechanicalTools3D() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;

      setMouse({
        x: x * 10,
        y: y * -7,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <section className="mechanical-hero">
      <style jsx>{`
        .mechanical-hero {
          position: relative;
          min-height: min(850px, calc(100vh - 70px));
          width: 100%;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 72% 42%,
              rgba(245, 158, 11, 0.14),
              transparent 28%
            ),
            radial-gradient(
              circle at 78% 80%,
              rgba(30, 64, 175, 0.15),
              transparent 30%
            ),
            linear-gradient(115deg, #05070a 0%, #0b1017 52%, #101722 100%);
          color: white;
          isolation: isolate;
        }

        .mechanical-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(
              rgba(255, 255, 255, 0.025) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.025) 1px,
              transparent 1px
            );
          background-size: 52px 52px;
          mask-image: linear-gradient(
            to right,
            transparent,
            black 30%,
            black 100%
          );
          pointer-events: none;
        }

        .hero-inner {
          position: relative;
          z-index: 2;
          width: min(1440px, 100%);
          min-height: inherit;
          margin: 0 auto;
          padding: 80px 6vw 70px;
          display: grid;
          grid-template-columns: 0.82fr 1.45fr;
          align-items: center;
          gap: 30px;
        }

        .hero-copy {
          position: relative;
          z-index: 10;
          max-width: 570px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          padding: 8px 13px;
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.06);
          color: #fbbf24;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
        }

        .eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #f59e0b;
          box-shadow: 0 0 14px rgba(245, 158, 11, 0.9);
        }

        .hero-title {
          margin: 0;
          font-size: clamp(42px, 5.2vw, 78px);
          line-height: 0.94;
          font-weight: 800;
          letter-spacing: -0.055em;
        }

        .hero-title span {
          display: block;
          color: #f59e0b;
        }

        .hero-description {
          max-width: 500px;
          margin: 28px 0 32px;
          color: #aeb8c5;
          font-size: clamp(15px, 1.35vw, 18px);
          line-height: 1.75;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .primary-button,
        .secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 21px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          transition:
            transform 180ms ease,
            background 180ms ease,
            border-color 180ms ease;
        }

        .primary-button {
          background: #f59e0b;
          color: #111827;
          box-shadow: 0 10px 35px rgba(245, 158, 11, 0.2);
        }

        .primary-button:hover {
          transform: translateY(-2px);
          background: #fbbf24;
        }

        .secondary-button {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.035);
          color: white;
        }

        .secondary-button:hover {
          transform: translateY(-2px);
          border-color: rgba(245, 158, 11, 0.5);
        }

        .hero-stats {
          display: flex;
          gap: 30px;
          margin-top: 42px;
          padding-top: 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
        }

        .stat strong {
          display: block;
          color: white;
          font-size: 20px;
        }

        .stat span {
          display: block;
          margin-top: 5px;
          color: #7f8a99;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.13em;
        }

        .showroom {
          position: relative;
          height: 650px;
          min-width: 0;
          perspective: 1200px;
        }

        .showroom-stage {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          transition: transform 160ms ease-out;
        }

        .showroom-light {
          position: absolute;
          width: 480px;
          height: 480px;
          left: 50%;
          top: 48%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(245, 158, 11, 0.17),
            rgba(245, 158, 11, 0.035) 42%,
            transparent 70%
          );
          filter: blur(5px);
        }

        .technical-ring {
          position: absolute;
          left: 52%;
          top: 48%;
          width: 500px;
          height: 500px;
          transform: translate(-50%, -50%) rotateX(68deg);
          border: 1px solid rgba(245, 158, 11, 0.18);
          border-radius: 50%;
          box-shadow:
            0 0 0 34px rgba(245, 158, 11, 0.025),
            0 0 0 68px rgba(245, 158, 11, 0.018);
          animation: ringSpin 24s linear infinite;
        }

        .technical-ring::before,
        .technical-ring::after {
          content: "";
          position: absolute;
          inset: 20px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }

        .technical-ring::after {
          inset: 75px;
          border-style: solid;
          border-color: rgba(245, 158, 11, 0.12);
        }

        .ring-mark {
          position: absolute;
          top: -5px;
          left: 50%;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #f59e0b;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.8);
        }

        .platform {
          position: absolute;
          left: 52%;
          bottom: 45px;
          width: 590px;
          height: 135px;
          transform: translateX(-50%) rotateX(68deg);
          transform-style: preserve-3d;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          background: linear-gradient(
            180deg,
            rgba(34, 42, 53, 0.95),
            rgba(8, 11, 16, 0.98)
          );
          box-shadow:
            0 35px 60px rgba(0, 0, 0, 0.55),
            inset 0 0 35px rgba(245, 158, 11, 0.045);
        }

        .platform::before {
          content: "";
          position: absolute;
          inset: 16px;
          border: 1px solid rgba(245, 158, 11, 0.18);
          border-radius: 50%;
        }

        .platform::after {
          content: "";
          position: absolute;
          inset: 35px 100px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }

        .main-machine {
          position: absolute;
          left: 52%;
          top: 49%;
          width: min(520px, 64vw);
          transform: translate(-50%, -50%) translateZ(100px);
          transform-style: preserve-3d;
          animation: machineFloat 5s ease-in-out infinite;
        }

        .main-machine-image {
          position: relative;
          width: 100%;
          aspect-ratio: 1.15 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 32px 30px rgba(0, 0, 0, 0.65));
        }

        .main-machine-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .machine-name {
          position: absolute;
          left: 50%;
          bottom: -18px;
          transform: translateX(-50%);
          min-width: 220px;
          padding: 11px 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          background: rgba(8, 12, 18, 0.82);
          backdrop-filter: blur(12px);
          text-align: center;
          box-shadow: 0 14px 35px rgba(0, 0, 0, 0.3);
        }

        .machine-name small {
          display: block;
          margin-bottom: 4px;
          color: #f59e0b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .machine-name strong {
          display: block;
          color: white;
          font-size: 16px;
        }

        .machine-card {
          position: absolute;
          z-index: 8;
          width: 190px;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 15px;
          background: rgba(13, 18, 25, 0.78);
          backdrop-filter: blur(14px);
          box-shadow: 0 22px 45px rgba(0, 0, 0, 0.42);
          transition:
            transform 300ms ease,
            border-color 300ms ease;
        }

        .machine-card:hover {
          transform: translateY(-7px) scale(1.02);
          border-color: rgba(245, 158, 11, 0.45);
        }

        .machine-card-image {
          width: 100%;
          height: 115px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 10px;
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.08),
              rgba(255, 255, 255, 0.015)
            );
        }

        .machine-card-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .machine-card-info {
          padding: 10px 3px 2px;
        }

        .machine-card-info small {
          display: block;
          color: #f59e0b;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .machine-card-info strong {
          display: block;
          margin-top: 4px;
          color: #f3f4f6;
          font-size: 13px;
        }

        .machine-card-left {
          left: 0;
          top: 115px;
          transform: translateZ(45px) rotateY(7deg);
        }

        .machine-card-right {
          right: 0;
          top: 125px;
          transform: translateZ(65px) rotateY(-7deg);
        }

        .machine-card-bottom {
          right: 25px;
          bottom: 80px;
          width: 175px;
          transform: translateZ(80px) rotateY(-4deg);
        }

        .machine-card-bottom .machine-card-image {
          height: 92px;
        }

        .technical-label {
          position: absolute;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #7d8998;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.15em;
        }

        .technical-label::before {
          content: "";
          width: 30px;
          height: 1px;
          background: rgba(245, 158, 11, 0.5);
        }

        .label-one {
          right: 4%;
          top: 54%;
        }

        .label-two {
          left: 7%;
          bottom: 26%;
        }

        .vertical-line {
          position: absolute;
          right: 4%;
          top: 12%;
          height: 210px;
          width: 1px;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(245, 158, 11, 0.5),
            transparent
          );
        }

        .vertical-line span {
          position: absolute;
          right: 8px;
          top: 0;
          writing-mode: vertical-rl;
          color: #697586;
          font-size: 8px;
          letter-spacing: 0.25em;
        }

        @keyframes machineFloat {
          0%,
          100% {
            transform: translate(-50%, -50%) translateZ(100px)
              translateY(0);
          }

          50% {
            transform: translate(-50%, -50%) translateZ(100px)
              translateY(-12px);
          }
        }

        @keyframes ringSpin {
          from {
            transform: translate(-50%, -50%) rotateX(68deg) rotateZ(0);
          }

          to {
            transform: translate(-50%, -50%) rotateX(68deg) rotateZ(360deg);
          }
        }

        @media (max-width: 1100px) {
          .hero-inner {
            grid-template-columns: 0.8fr 1.2fr;
            padding-left: 4vw;
            padding-right: 4vw;
          }

          .showroom {
            height: 570px;
          }

          .main-machine {
            width: 450px;
          }

          .platform {
            width: 500px;
          }

          .technical-ring {
            width: 420px;
            height: 420px;
          }

          .machine-card {
            width: 165px;
          }

          .machine-card-image {
            height: 95px;
          }
        }

        @media (max-width: 820px) {
          .mechanical-hero {
            min-height: auto;
          }

          .hero-inner {
            grid-template-columns: 1fr;
            padding-top: 65px;
            padding-bottom: 25px;
          }

          .hero-copy {
            max-width: 680px;
          }

          .showroom {
            height: 590px;
            margin-top: 10px;
          }

          .main-machine {
            width: min(480px, 72vw);
          }

          .machine-card-left {
            left: 2%;
            top: 95px;
          }

          .machine-card-right {
            right: 2%;
            top: 90px;
          }

          .machine-card-bottom {
            right: 8%;
            bottom: 55px;
          }

          .technical-label,
          .vertical-line {
            display: none;
          }
        }

        @media (max-width: 560px) {
          .hero-inner {
            padding: 48px 20px 10px;
          }

          .hero-title {
            font-size: clamp(42px, 13vw, 62px);
          }

          .hero-description {
            font-size: 14px;
            line-height: 1.65;
          }

          .hero-stats {
            gap: 18px;
            margin-top: 30px;
          }

          .stat strong {
            font-size: 17px;
          }

          .stat span {
            font-size: 8px;
          }

          .showroom {
            height: 500px;
          }

          .showroom-light {
            width: 330px;
            height: 330px;
          }

          .technical-ring {
            width: 330px;
            height: 330px;
          }

          .platform {
            width: 380px;
            height: 95px;
            bottom: 25px;
          }

          .main-machine {
            width: min(390px, 92vw);
            top: 48%;
          }

          .machine-card {
            width: 135px;
            padding: 7px;
            border-radius: 11px;
          }

          .machine-card-image {
            height: 75px;
          }

          .machine-card-info {
            padding-top: 7px;
          }

          .machine-card-info small {
            font-size: 7px;
          }

          .machine-card-info strong {
            font-size: 11px;
          }

          .machine-card-left {
            left: -4px;
            top: 55px;
          }

          .machine-card-right {
            right: -4px;
            top: 55px;
          }

          .machine-card-bottom {
            right: 50%;
            bottom: 5px;
            transform: translateX(50%);
            width: 150px;
          }

          .machine-card-bottom .machine-card-image {
            height: 68px;
          }

          .machine-name {
            bottom: -14px;
            min-width: 180px;
            padding: 8px 14px;
          }

          .machine-name strong {
            font-size: 13px;
          }

          .machine-name small {
            font-size: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .technical-ring,
          .main-machine {
            animation: none;
          }

          .showroom-stage {
            transition: none;
          }
        }
      `}</style>

      <div className="hero-inner">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            MACHINERY TOOLS NEPAL · POKHARA
          </div>

          <h1 className="hero-title">
            MACHINERY
            <span>BUILT FOR WORK.</span>
          </h1>

          <p className="hero-description">
            Agricultural machinery, power tools and mechanical equipment for
            farms, workshops, construction and industry across Nepal.
          </p>

          <div className="hero-actions">
            <Link href="/products" className="primary-button">
              Explore Machinery
            </Link>

            <a href="/contact" className="secondary-button">
              Request a Quote
            </a>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <strong>01</strong>
              <span>AGRICULTURE</span>
            </div>

            <div className="stat">
              <strong>02</strong>
              <span>POWER TOOLS</span>
            </div>

            <div className="stat">
              <strong>03</strong>
              <span>WORKSHOP</span>
            </div>
          </div>
        </div>

        <div className="showroom">
          <div
            className="showroom-stage"
            style={{
              transform: `
                rotateX(${mouse.y}deg)
                rotateY(${mouse.x}deg)
              `,
            }}
          >
            <div className="showroom-light" />

            <div className="technical-ring">
              <span className="ring-mark" />
            </div>

            <div className="platform" />

            <div className="main-machine">
              <div className="main-machine-image">
                <img
                  src={mainMachine.image}
                  alt={mainMachine.name}
                  loading="eager"
                />
              </div>

              <div className="machine-name">
                <small>{mainMachine.category}</small>
                <strong>{mainMachine.name}</strong>
              </div>
            </div>

            {supportingMachines.map((machine) => (
              <div
                key={machine.name}
                className={`machine-card ${machine.position}`}
              >
                <div className="machine-card-image">
                  <img
                    src={machine.image}
                    alt={machine.name}
                    loading="eager"
                  />
                </div>

                <div className="machine-card-info">
                  <small>{machine.category}</small>
                  <strong>{machine.name}</strong>
                </div>
              </div>
            ))}

            <div className="technical-label label-one">
              ENGINEERED EQUIPMENT
            </div>

            <div className="technical-label label-two">
              AGRICULTURE · INDUSTRY
            </div>

            <div className="vertical-line">
              <span>B&amp;B MACHINERY</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}