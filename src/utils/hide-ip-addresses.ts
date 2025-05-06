export function hideIpAddresses(text: string): string {
  // Regular expression to match IPv4 addresses
  const ipAddressRegex =
    /(\b25[0-5]|\b2[0-4][0-9]|\b[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?\b)/g

  return text.replace(ipAddressRegex, '0.0.0.0')
}
