/**
 * Auth Layout - Ultra Premium Dark Theme
 *
 * World-class design for the most powerful AI tool.
 */
import * as React from 'react';
import { Box, Container, Typography } from '@mui/joy';

export function AuthLayout(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `
          linear-gradient(to bottom,
            #0a0e1a 0%,
            #0f1829 20%,
            #162842 40%,
            #1d3a5f 60%,
            #2a4a6d 80%,
            #6b5d4f 95%,
            #8b7355 100%
          )
        `,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Milky Way - Blue/Cyan Nebula band across center */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 150% 40% at 50% 38%, rgba(14, 165, 233, 0.25) 0%, rgba(6, 182, 212, 0.12) 40%, transparent 60%),
            radial-gradient(ellipse 120% 30% at 30% 42%, rgba(56, 189, 248, 0.22) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 70%),
            radial-gradient(ellipse 120% 30% at 70% 42%, rgba(96, 165, 250, 0.2) 0%, rgba(147, 197, 253, 0.08) 50%, transparent 70%),
            radial-gradient(ellipse 100% 25% at 50% 38%, rgba(125, 211, 252, 0.18) 0%, rgba(103, 232, 249, 0.08) 50%, transparent 70%),
            radial-gradient(ellipse 80% 20% at 45% 40%, rgba(139, 92, 246, 0.12) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
          animation: 'nebulaPulse 18s ease-in-out infinite',
          '@keyframes nebulaPulse': {
            '0%, 100%': { opacity: 0.85 },
            '50%': { opacity: 1 },
          },
        }}
      />

      {/* Starfield Layer 1 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '2px',
          height: '2px',
          background: 'transparent',
          pointerEvents: 'none',
          boxShadow: `
            100px 200px #fff, 300px 100px #fff, 500px 300px #fff, 700px 150px #fff, 900px 250px #fff,
            1100px 100px #fff, 1300px 350px #fff, 200px 400px #fff, 400px 500px #fff, 600px 450px #fff,
            800px 550px #fff, 1000px 600px #fff, 1200px 500px #fff, 150px 650px #fff, 350px 700px #fff,
            550px 750px #fff, 750px 650px #fff, 950px 700px #fff, 1150px 750px #fff, 250px 50px #fff
          `,
          animation: 'twinkle1 3.2s ease-in-out infinite',
          animationDelay: '0s',
          '@keyframes twinkle1': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.3 },
          },
        }}
      />

      {/* Starfield Layer 2 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '2px',
          height: '2px',
          background: 'transparent',
          pointerEvents: 'none',
          boxShadow: `
            450px 150px #fff, 650px 100px #fff, 850px 200px #fff, 1050px 50px #fff, 1250px 150px #fff,
            50px 100px #fff, 250px 200px #fff, 450px 300px #fff, 650px 250px #fff, 850px 350px #fff,
            1050px 200px #fff, 1250px 300px #fff, 120px 450px #fff, 320px 550px #fff, 520px 500px #fff,
            720px 600px #fff, 920px 550px #fff, 1120px 650px #fff, 80px 700px #fff, 280px 750px #fff
          `,
          animation: 'twinkle2 4.1s ease-in-out infinite',
          animationDelay: '1.3s',
          '@keyframes twinkle2': {
            '0%, 100%': { opacity: 0.9 },
            '50%': { opacity: 0.2 },
          },
        }}
      />

      {/* Starfield Layer 3 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1.5px',
          height: '1.5px',
          background: 'transparent',
          pointerEvents: 'none',
          boxShadow: `
            480px 700px #fff, 680px 800px #fff, 880px 750px #fff, 1080px 800px #fff, 1280px 750px #fff,
            60px 30px rgba(255, 255, 255, 0.7), 260px 80px rgba(255, 255, 255, 0.7),
            460px 130px rgba(255, 255, 255, 0.7), 660px 80px rgba(255, 255, 255, 0.7),
            860px 130px rgba(255, 255, 255, 0.7), 1060px 30px rgba(255, 255, 255, 0.7),
            1260px 80px rgba(255, 255, 255, 0.7), 140px 420px rgba(255, 255, 255, 0.6),
            340px 470px rgba(255, 255, 255, 0.6), 540px 420px rgba(255, 255, 255, 0.6),
            740px 570px rgba(255, 255, 255, 0.6), 940px 520px rgba(255, 255, 255, 0.6)
          `,
          animation: 'twinkle3 5.3s ease-in-out infinite',
          animationDelay: '2.7s',
          '@keyframes twinkle3': {
            '0%, 100%': { opacity: 0.8 },
            '50%': { opacity: 0.4 },
          },
        }}
      />

      {/* Starfield Layer 4 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          background: 'transparent',
          pointerEvents: 'none',
          boxShadow: `
            130px 230px #fff, 330px 130px #fff, 530px 330px #fff, 730px 180px #fff, 930px 280px #fff,
            1130px 130px #fff, 1330px 380px #fff, 230px 430px #fff, 430px 530px #fff, 630px 480px #fff,
            830px 580px #fff, 1030px 630px #fff, 1230px 530px #fff, 180px 680px #fff, 380px 730px #fff
          `,
          animation: 'twinkle4 3.7s ease-in-out infinite',
          animationDelay: '0.8s',
          '@keyframes twinkle4': {
            '0%, 100%': { opacity: 0.85 },
            '50%': { opacity: 0.25 },
          },
        }}
      />

      {/* Starfield Layer 5 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          background: 'transparent',
          pointerEvents: 'none',
          boxShadow: `
            580px 780px #fff, 780px 680px #fff, 980px 730px #fff, 1180px 780px #fff, 280px 80px #fff,
            480px 180px #fff, 680px 130px #fff, 880px 230px #fff, 1080px 80px #fff, 1280px 180px #fff,
            90px 110px rgba(255, 255, 255, 0.5), 290px 210px rgba(255, 255, 255, 0.5),
            490px 310px rgba(255, 255, 255, 0.5), 690px 260px rgba(255, 255, 255, 0.5),
            890px 360px rgba(255, 255, 255, 0.5), 1090px 210px rgba(255, 255, 255, 0.5)
          `,
          animation: 'twinkle5 4.5s ease-in-out infinite',
          animationDelay: '2.1s',
          '@keyframes twinkle5': {
            '0%, 100%': { opacity: 0.75 },
            '50%': { opacity: 0.35 },
          },
        }}
      />

      {/* Colored starfield - Blue/Cyan nebula stars */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          background: 'transparent',
          pointerEvents: 'none',
          boxShadow: `
            200px 300px rgba(125, 211, 252, 0.8), 400px 250px rgba(56, 189, 248, 0.7),
            600px 350px rgba(14, 165, 233, 0.8), 800px 300px rgba(96, 165, 250, 0.6),
            1000px 280px rgba(59, 130, 246, 0.7), 1200px 320px rgba(147, 197, 253, 0.8),
            150px 400px rgba(125, 211, 252, 0.6), 350px 450px rgba(56, 189, 248, 0.5),
            550px 420px rgba(14, 165, 233, 0.7), 750px 380px rgba(96, 165, 250, 0.5),
            950px 400px rgba(59, 130, 246, 0.6), 1150px 450px rgba(147, 197, 253, 0.7),
            250px 200px rgba(6, 182, 212, 0.7), 450px 150px rgba(103, 232, 249, 0.6),
            650px 180px rgba(34, 211, 238, 0.6), 850px 220px rgba(6, 182, 212, 0.7),
            1050px 160px rgba(103, 232, 249, 0.6), 1250px 200px rgba(34, 211, 238, 0.6),
            300px 320px rgba(167, 139, 250, 0.4), 700px 340px rgba(167, 139, 250, 0.4)
          `,
          animation: 'colorTwinkle 4.8s ease-in-out infinite',
          animationDelay: '1.5s',
          '@keyframes colorTwinkle': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.3 },
          },
        }}
      />

      {/* Cosmic glow 1 - Bright Blue */}
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          right: '10%',
          width: '550px',
          height: '320px',
          background: 'radial-gradient(ellipse, rgba(56, 189, 248, 0.28) 0%, rgba(14, 165, 233, 0.15) 40%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          animation: 'float 20s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translate(0, 0)' },
            '50%': { transform: 'translate(-20px, -15px)' },
          },
        }}
      />

      {/* Cosmic glow 2 - Cyan/Teal */}
      <Box
        sx={{
          position: 'absolute',
          top: '25%',
          left: '15%',
          width: '480px',
          height: '280px',
          background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.22) 0%, rgba(34, 211, 238, 0.12) 40%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(75px)',
          pointerEvents: 'none',
          animation: 'floatReverse 18s ease-in-out infinite',
          '@keyframes floatReverse': {
            '0%, 100%': { transform: 'translate(0, 0)' },
            '50%': { transform: 'translate(30px, 20px)' },
          },
        }}
      />

      {/* Warm sunrise glow at bottom - Enhanced */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: `
            radial-gradient(ellipse 120% 80% at 50% 100%, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 40%, transparent 70%),
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(251, 191, 36, 0.12) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
          filter: 'blur(50px)',
        }}
      />

      {/* Comet 1 - Rare fast white streak */}
      <Box
        sx={{
          position: 'absolute',
          top: '12%',
          left: '-5%',
          width: '180px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.7) 85%, #fff 100%)',
          borderRadius: '50%',
          transform: 'rotate(32deg)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'comet1 47s linear infinite',
          animationDelay: '3s',
          '@keyframes comet1': {
            '0%, 92%': { opacity: 0, transform: 'rotate(32deg) translateX(0)' },
            '93%': { opacity: 1 },
            '98%': { opacity: 1 },
            '99%': { opacity: 0, transform: 'rotate(32deg) translateX(calc(100vw + 250px))' },
            '100%': { opacity: 0, transform: 'rotate(32deg) translateX(calc(100vw + 250px))' },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: '-2px',
            width: '5px',
            height: '5px',
            background: '#fff',
            borderRadius: '50%',
            boxShadow: '0 0 8px 2px rgba(255,255,255,0.9), 0 0 15px 3px rgba(125,211,252,0.5)',
          },
        }}
      />

      {/* Comet 2 - Slow cyan comet, very rare */}
      <Box
        sx={{
          position: 'absolute',
          top: '28%',
          left: '-8%',
          width: '140px',
          height: '1.5px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(125,211,252,0.05) 40%, rgba(125,211,252,0.6) 90%, #7dd3fc 100%)',
          borderRadius: '50%',
          transform: 'rotate(22deg)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'comet2 73s linear infinite',
          animationDelay: '19s',
          '@keyframes comet2': {
            '0%, 88%': { opacity: 0, transform: 'rotate(22deg) translateX(0)' },
            '89%': { opacity: 0.9 },
            '96%': { opacity: 0.9 },
            '97%': { opacity: 0, transform: 'rotate(22deg) translateX(calc(100vw + 200px))' },
            '100%': { opacity: 0, transform: 'rotate(22deg) translateX(calc(100vw + 200px))' },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: '-2px',
            width: '4px',
            height: '4px',
            background: '#7dd3fc',
            borderRadius: '50%',
            boxShadow: '0 0 6px 2px rgba(125,211,252,0.8), 0 0 12px 3px rgba(56,189,248,0.4)',
          },
        }}
      />

      {/* Comet 3 - Quick golden meteor */}
      <Box
        sx={{
          position: 'absolute',
          top: '65%',
          left: '-3%',
          width: '90px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.05) 40%, rgba(251,191,36,0.5) 90%, #fbbf24 100%)',
          borderRadius: '50%',
          transform: 'rotate(38deg)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'comet3 31s linear infinite',
          animationDelay: '7s',
          '@keyframes comet3': {
            '0%, 95%': { opacity: 0, transform: 'rotate(38deg) translateX(0)' },
            '96%': { opacity: 0.7 },
            '99%': { opacity: 0.7 },
            '99.5%': { opacity: 0, transform: 'rotate(38deg) translateX(calc(100vw + 120px))' },
            '100%': { opacity: 0, transform: 'rotate(38deg) translateX(calc(100vw + 120px))' },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: '-1px',
            width: '3px',
            height: '3px',
            background: '#fbbf24',
            borderRadius: '50%',
            boxShadow: '0 0 5px 1px rgba(251,191,36,0.8), 0 0 10px 2px rgba(245,158,11,0.4)',
          },
        }}
      />

      {/* Comet 4 - Elegant purple, opposite direction */}
      <Box
        sx={{
          position: 'absolute',
          top: '18%',
          right: '-5%',
          width: '220px',
          height: '2px',
          background: 'linear-gradient(270deg, transparent 0%, rgba(167,139,250,0.05) 30%, rgba(167,139,250,0.5) 85%, #a78bfa 100%)',
          borderRadius: '50%',
          transform: 'rotate(-28deg)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'comet4 97s linear infinite',
          animationDelay: '41s',
          '@keyframes comet4': {
            '0%, 94%': { opacity: 0, transform: 'rotate(-28deg) translateX(0)' },
            '95%': { opacity: 0.85 },
            '99%': { opacity: 0.85 },
            '99.5%': { opacity: 0, transform: 'rotate(-28deg) translateX(calc(-100vw - 280px))' },
            '100%': { opacity: 0, transform: 'rotate(-28deg) translateX(calc(-100vw - 280px))' },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '-3px',
            width: '6px',
            height: '6px',
            background: '#a78bfa',
            borderRadius: '50%',
            boxShadow: '0 0 10px 2px rgba(167,139,250,0.8), 0 0 20px 4px rgba(139,92,246,0.4)',
          },
        }}
      />

      {/* Comet 5 - Faint distant comet */}
      <Box
        sx={{
          position: 'absolute',
          top: '45%',
          left: '-6%',
          width: '110px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.3) 90%, rgba(255,255,255,0.5) 100%)',
          borderRadius: '50%',
          transform: 'rotate(18deg)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'comet5 127s linear infinite',
          animationDelay: '67s',
          '@keyframes comet5': {
            '0%, 96%': { opacity: 0, transform: 'rotate(18deg) translateX(0)' },
            '97%': { opacity: 0.5 },
            '99.5%': { opacity: 0.5 },
            '99.8%': { opacity: 0, transform: 'rotate(18deg) translateX(calc(100vw + 150px))' },
            '100%': { opacity: 0, transform: 'rotate(18deg) translateX(calc(100vw + 150px))' },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: '-1px',
            width: '2px',
            height: '2px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '50%',
            boxShadow: '0 0 3px 1px rgba(255,255,255,0.4)',
          },
        }}
      />

      {/* Comet 6 - Very rare bright comet */}
      <Box
        sx={{
          position: 'absolute',
          top: '78%',
          left: '-4%',
          width: '160px',
          height: '1.5px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.03) 35%, rgba(56,189,248,0.6) 88%, #38bdf8 100%)',
          borderRadius: '50%',
          transform: 'rotate(15deg)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'comet6 83s linear infinite',
          animationDelay: '29s',
          '@keyframes comet6': {
            '0%, 97%': { opacity: 0, transform: 'rotate(15deg) translateX(0)' },
            '97.5%': { opacity: 0.8 },
            '99.5%': { opacity: 0.8 },
            '99.8%': { opacity: 0, transform: 'rotate(15deg) translateX(calc(100vw + 200px))' },
            '100%': { opacity: 0, transform: 'rotate(15deg) translateX(calc(100vw + 200px))' },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: '-2px',
            width: '4px',
            height: '4px',
            background: '#38bdf8',
            borderRadius: '50%',
            boxShadow: '0 0 6px 2px rgba(56,189,248,0.8), 0 0 12px 3px rgba(14,165,233,0.4)',
          },
        }}
      />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        {/* ABOV3 Logo */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Box
            component="img"
            src="/images/abov3-logo.png"
            alt="ABOV3"
            sx={{
              height: { xs: '50px', sm: '60px' },
              width: 'auto',
              filter: 'drop-shadow(0 0 80px rgba(139, 92, 246, 0.4)) drop-shadow(0 0 40px rgba(139, 92, 246, 0.3))',
              transition: 'filter 0.3s ease',
              '&:hover': {
                filter: 'drop-shadow(0 0 100px rgba(139, 92, 246, 0.6)) drop-shadow(0 0 50px rgba(139, 92, 246, 0.4))',
              },
            }}
          />
        </Box>

        {/* Auth Card with premium glass effect */}
        <Box
          sx={{
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: -2,
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(255, 128, 0, 0.2))',
              borderRadius: '20px',
              opacity: 0.5,
              filter: 'blur(20px)',
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              backgroundColor: 'rgba(10, 10, 10, 0.85)',
              backdropFilter: 'blur(40px) saturate(180%)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              p: { xs: 3, sm: 3.5 },
              boxShadow: `
                0 25px 50px -12px rgba(0, 0, 0, 0.8),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
              `,
            }}
          >
            {/* Title */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography
                level="h2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontWeight: 400,
                  letterSpacing: '0.25em',
                  mb: 0.5,
                  fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontVariant: 'small-caps',
                }}
              >
                {props.title}
              </Typography>
              {props.subtitle && (
                <Typography
                  level="body-md"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: 400,
                    fontSize: '0.75rem',
                  }}
                >
                  {props.subtitle}
                </Typography>
              )}
            </Box>

            {/* Form Content */}
            {props.children}
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            mt: 4,
            textAlign: 'center',
          }}
        >
          <Typography
            level="body-xs"
            sx={{
              color: 'rgba(255, 255, 255, 0.25)',
              letterSpacing: '0.15em',
              fontWeight: 500,
              fontSize: '0.65rem',
            }}
          >
            EXODUS • GENESIS • SOLOMON
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
