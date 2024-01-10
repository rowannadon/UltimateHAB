
export interface Color {
    r: number,
    g: number,
    b: number,
}

export class ColorConverter {
    static toHex(color: Color) {
      const rHex = this.componentToHex(color.r)
      const gHex = this.componentToHex(color.g)
      const bHex = this.componentToHex(color.b)
      return `#${rHex}${gHex}${bHex}`
    }

    static toArray(color: Color) {
        return [color.r, color.g, color.b]
    }
  
    static componentToHex(component: number) {
      const hex = component.toString(16);
      return hex.length === 1 ? "0" + hex : hex
    }

    static adjust(color: Color, amount: number) {
        // Map the amount from a range of 0-100 to 0-1
        let normalizedAmount = mapRange(amount, 0, 100, 0, 1)
        let inverseAmount = 1 - normalizedAmount

        // Create a new color where each channel is a blend of the original color and white or black
        return {
            r: Math.round((color.r * inverseAmount) + (255 * normalizedAmount)),
            g: Math.round((color.g * inverseAmount) + (255 * normalizedAmount)),
            b: Math.round((color.b * inverseAmount) + (255 * normalizedAmount))
        }
    }
  
    static randomColor = () => {
        var h = randomInt(0, 360)
        var s = randomInt(200, 254)
        var v = randomInt(200, 254)
        return HSVtoRGB(h/255, s/255, v/255)
    }

    
}

export const randomInt = (min:number, max:number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
};

 export const randomColor = () => {
    var h = randomInt(0, 360)
    var s = randomInt(200, 254)
    var v = randomInt(200, 254)
    return HSVtoRGB(h/255, s/255, v/255)
}

export function HSVtoRGB(h:number, s:number, v:number) {
    var r = 0, g = 0, b = 0, i, f, p, q, t

    i = Math.floor(h * 6)
    f = h * 6 - i
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break
        case 1: r = q, g = v, b = p; break
        case 2: r = p, g = v, b = t; break
        case 3: r = p, g = q, b = v; break
        case 4: r = t, g = p, b = v; break
        case 5: r = v, g = p, b = q; break
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}

export function mapRange(value: number, inputMin: number, inputMax: number, outputMin: number, outputMax: number) {
    // Ensure we avoid dividing by zero
    if (inputMin === inputMax) {
        throw new Error("Input range cannot be zero.")
    }

    // First, normalize the value to a range of 0-1
    let normalized = (value - inputMin) / (inputMax - inputMin)

    // Then, scale this normalized value to the output range
    return normalized * (outputMax - outputMin) + outputMin
}

export function chunkArray(array: any[], chunkSize: number) {
    if (chunkSize <= 0) {
        throw new Error("Chunk size must be greater than 0");
    }

    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        // For the first chunk, slice normally
        if (i === 0) {
            result.push(array.slice(i, i + chunkSize+1));
        } else {
            // For subsequent chunks, include the last element of the previous chunk
            result.push(array.slice(i - 1, i + chunkSize));
        }
    }
    return result;
}