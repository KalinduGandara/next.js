// @ts-ignore
import fetch from 'next/dist/compiled/node-fetch'
import fontData from './font-data.json'
const allowedDisplayValues = ['auto', 'block', 'swap', 'fallback', 'optional']

const formatValues = (values: string[]) =>
  values.map((val) => `\`${val}\``).join(', ')

type FontOptions = {
  fontFamily: string
  weight: string
  style: string
  display: string
  preload: boolean
  selectedVariableAxes?: string[]
  fallback?: string[]
  adjustFontFallback: boolean
}
export function validateData(functionName: string, data: any): FontOptions {
  let {
    variant,
    display = 'optional',
    preload = true,
    axes,
    fallback,
    adjustFontFallback = true,
  } = data[0] || ({} as any)
  if (functionName === '') {
    throw new Error(`@next/font/google has no default export`)
  }

  const fontFamily = functionName.replace(/_/g, ' ')

  const fontVariants = (fontData as any)[fontFamily]?.variants
  if (!fontVariants) {
    throw new Error(`Unknown font \`${fontFamily}\``)
  }

  // Set variable as default, throw if not available
  if (!variant) {
    if (fontVariants.includes('variable')) {
      variant = 'variable'
    } else {
      throw new Error(
        `Missing variant for font \`${fontFamily}\`.\nAvailable variants: ${formatValues(
          fontVariants
        )}`
      )
    }
  }

  if (!fontVariants.includes(variant)) {
    throw new Error(
      `Unknown variant \`${variant}\` for font \`${fontFamily}\`.\nAvailable variants: ${formatValues(
        fontVariants
      )}`
    )
  }

  if (!allowedDisplayValues.includes(display)) {
    throw new Error(
      `Invalid display value \`${display}\` for font \`${fontFamily}\`.\nAvailable display values: ${formatValues(
        allowedDisplayValues
      )}`
    )
  }

  const [weight, style] = variant.split('-')

  if (weight !== 'variable' && axes) {
    throw new Error('Axes can only be defined for variable fonts')
  }

  return {
    fontFamily,
    weight,
    style,
    display,
    preload,
    selectedVariableAxes: axes,
    fallback,
    adjustFontFallback,
  }
}

export function getUrl(
  fontFamily: string,
  axes: [string, string][],
  display: string
) {
  // Google api requires the axes to be sorted, starting with lowercase words
  axes.sort(([a], [b]) => {
    const aIsLowercase = a.charCodeAt(0) > 96
    const bIsLowercase = b.charCodeAt(0) > 96
    if (aIsLowercase && !bIsLowercase) return -1
    if (bIsLowercase && !aIsLowercase) return 1

    return a > b ? 1 : -1
  })

  return `https://fonts.googleapis.com/css2?family=${fontFamily.replace(
    / /g,
    '+'
  )}:${axes.map(([key]) => key).join(',')}@${axes
    .map(([, val]) => val)
    .join(',')}&display=${display}`
}

export async function fetchCSSFromGoogleFonts(url: string, fontFamily: string) {
  let mockedResponse: string | undefined
  if (process.env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES) {
    const mockFile = require(process.env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES)
    mockedResponse = mockFile[url]
    if (!mockedResponse) {
      throw new Error('Missing mocked response for URL: ' + url)
    }
  }

  let cssResponse
  if (mockedResponse) {
    cssResponse = mockedResponse
  } else {
    const res = await fetch(url, {
      headers: {
        // The file format is based off of the user agent, make sure woff2 files are fetched
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
      },
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch font  \`${fontFamily}\`.\nURL: ${url}`)
    }

    cssResponse = await res.text()
  }

  return cssResponse
}

export function getFontAxes(
  fontFamily: string,
  weight: string,
  style: string,
  selectedVariableAxes?: string[]
): [string, string][] {
  const allAxes: Array<{ tag: string; min: number; max: number }> = (
    fontData as any
  )[fontFamily].axes
  const italicAxis: [string, string][] =
    style === 'italic' ? [['ital', '1']] : []

  if (weight === 'variable') {
    if (selectedVariableAxes) {
      const defineAbleAxes: string[] = allAxes
        .map(({ tag }) => tag)
        .filter((tag) => tag !== 'wght')
      if (defineAbleAxes.length === 0) {
        throw new Error(`Font \`${fontFamily}\` has no definable \`axes\``)
      }
      if (!Array.isArray(selectedVariableAxes)) {
        throw new Error(
          `Invalid axes value for font \`${fontFamily}\`, expected an array of axes.\nAvailable axes: ${formatValues(
            defineAbleAxes
          )}`
        )
      }
      selectedVariableAxes.forEach((key) => {
        if (!defineAbleAxes.some((tag) => tag === key)) {
          throw new Error(
            `Invalid axes value \`${key}\` for font \`${fontFamily}\`.\nAvailable axes: ${formatValues(
              defineAbleAxes
            )}`
          )
        }
      })
    }

    const variableAxes: [string, string][] = allAxes
      .filter(
        ({ tag }) => tag === 'wght' || selectedVariableAxes?.includes(tag)
      )
      .map(({ tag, min, max }) => [tag, `${min}..${max}`])

    return [...italicAxis, ...variableAxes]
  } else {
    return [...italicAxis, ['wght', weight]]
  }
}
