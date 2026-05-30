const base64Decode = (input: string): string => {
  if (typeof atob !== 'undefined') {
    return atob(input)
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let str = input.replace(/=+$/, '')
  let output = ''
  if (str.length % 4 === 1) throw new Error('Invalid string')
  for (let i = 0; i < str.length; i += 4) {
    const enc1 = chars.indexOf(str.charAt(i))
    const enc2 = chars.indexOf(str.charAt(i + 1))
    const enc3 = chars.indexOf(str.charAt(i + 2))
    const enc4 = chars.indexOf(str.charAt(i + 3))
    const chr1 = (enc1 << 2) | (enc2 >> 4)
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
    const chr3 = ((enc3 & 3) << 6) | enc4
    output += String.fromCharCode(chr1)
    if (enc3 !== 64) output += String.fromCharCode(chr2)
    if (enc4 !== 64) output += String.fromCharCode(chr3)
  }
  return output
}

export default base64Decode