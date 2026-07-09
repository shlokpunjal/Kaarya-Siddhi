export const isValidEmail = (value: string): boolean => {
  const trimmed = value.trim();

  // Structural check: local@domain.tld, TLD must be 2-24 letters only
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,24}$/;
  if (!emailRegex.test(trimmed)) return false;

  // Reject common typo TLDs that are structurally valid but not real
  const domain = trimmed.split("@")[1]?.toLowerCase();
  const knownGoodDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
  ];

  // If it's a well-known provider, enforce the exact correct TLD
  const knownProviders = ["gmail", "yahoo", "outlook", "hotmail", "icloud"];
  const domainParts = domain?.split(".") ?? [];
  const provider = domainParts[0];

  if (
    knownProviders.includes(provider) &&
    !knownGoodDomains.includes(domain!)
  ) {
    return false; // e.g. "gmail.comp", "gmail.co" typos
  }

  return true;
};

export const isValidPhone = (value: string): boolean => {
  return /^\d{10}$/.test(value.trim());
};

export const isValidName = (value: string) => /^[A-Za-z\s]+$/.test(value.trim());