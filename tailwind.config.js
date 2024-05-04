import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        abru: {
          DEFAULT: '#1C1320',

          light: {
            85: '#DDDCDD',
            75: '#C7C4C7',
            70: '#BBB8BC',
            60: '#A6A0A6',
            55: '#99959B',
            50: '#8D898F',
            35: '#6B666E',
            30: '#605B62',
            25: '#564D59',
            15: '#3E3641',
            10: '#332B36',
            5: '#272129',
            3: '#221D24',
          },

          dark: {
            3: '#1A161B',
            6: '#19161A',
            10: '#181519',
            15: '#171418',
            20: '#161216',
            25: '#141115',
            29: '#131014',
          },
        },

        accent: {
          DEFAULT: '#F61059',
          hover: '#dd0e50',

          // main-accent/dark/25%
          600: '#F61059',

          // main-accent/light/25%
          400: '#F84C82',

          // main-accent/light/75%
          200: '#FDCFDE',
        },

        ash: '#F4F4ED',

        alert: '#FF9E1F',
        steam: '#6F9F31',

        'team-blu': 'rgb(88 121 138)',
        'team-red': 'rgb(189 59 59)',

        'place-1st': '#E3C392',
        'place-2nd': '#BBBBBB',
        'place-3rd': '#E3A592',
      },
      aspectRatio: {
        '3/1': '3 / 1',
      },
      keyframes: {
        rotate: {
          from: 'rotate(0deg)',
          to: 'rotate(90deg)',
        },
      },
      animation: {
        rotate: 'rotate 500ms linear',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
