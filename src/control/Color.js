import rgba from '../../external/colorRBGA.js';

/**
 * Provides various functions to manipulate colors.
 *
 * In particular {@link Color.lstarToAlpha} is used by {@link QuestTracker} to provide a transparent color background
 * based on the perceived lightness of a given color. This is useful for various UI theming modules that provide a solid
 * color for {@link Application} backgrounds.
 *
 * @see https://stackoverflow.com/a/56678483
 */
export default class Color
{
   /**
    * Returns an alpha value (0 - 1) based on the perceived lightness of the provided color.
    *
    * @param {number[]|string}   color - A CSS color string or array of RGB color channels.
    *
    * @param {number}   start - The lower alpha bound applied to lighter colors.
    *
    * @param {number}   end - The upper alpha bound applied to darker colors.
    *
    * @returns {number} An alpha value based on the colors perceived lightness.
    */
   static lstarToAlpha(color, start, end)
   {
      const lStar = Color.lumaToLStar(Color.rgbToLuma(color));

      const inverseLStar = (100 - lStar) / 100;

      return s_LERP(start, end, inverseLStar);
   }

   /**
    * Converts a luminance value to perceived brightness.
    *
    * @param {number}   luma - luminance value of 0 - 1.
    *
    * @returns {number} L* value from 0 (black) to 100 (white) in perceived brightness.
    */
   static lumaToLStar(luma)
   {
      // The CIE standard states 0.008856 but 216 / 24389 is the intent for 0.008856451679036
      if (luma <= (216 / 24389))
      {
         // The CIE standard states 903.3, but 24389 / 27 is the intent, making 903.296296296296296
         return luma * (24389 / 27);
      }
      else
      {
         return Math.pow(luma, (1 / 3)) * 116 - 16;
      }
   }

   /**
    * Converts a CSS color to luminance (0 - 1).
    *
    * @param {number[]|string}   color - A CSS color string or array of RGB color channels.
    *
    * @returns {number} Luminance (0 - 1).
    */
   static rgbToLuma(color)
   {
      const val = typeof color === 'string' ? rgba(color) : color;

      return Array.isArray(val) ? 0.2126 * Color.rgbToLinear(val[0] / 255) + 0.7152 * Color.rgbToLinear(val[1] / 255) +
       0.0722 * Color.rgbToLinear(val[2] / 255) : 0;
   }

   /**
    * Linearizes a decimal sRGB gamma encoded color value between 0 - 1.
    *
    * @param {number}   colorChannel - Color channel normalized to 0 - 1.
    *
    * @returns {number} Linearized color value.
    */
   static rgbToLinear(colorChannel)
   {
      if (colorChannel <= 0.04045) { return colorChannel / 12.92; }
      else { return Math.pow(((colorChannel + 0.055) / 1.055), 2.4); }
   }
}

/**
 * Linear interpolation.
 *
 * @param {number}   start - The lower bound.
 *
 * @param {number}   end - The upper bound.
 *
 * @param {number}   midpoint - A value between 0 - 1.
 *
 * @returns {number} Value between start and end.
 */
const s_LERP = (start, end, midpoint) => start * (1 - midpoint) + end * midpoint;
