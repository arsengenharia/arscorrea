function validateCPF(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder >= 10) remainder = 0;
  if (remainder !== digits[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder >= 10) remainder = 0;
  if (remainder !== digits[10]) return false;

  return true;
}

function validateCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;

  const digits = cnpj.split("").map(Number);

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * weights1[i];
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (firstDigit !== digits[12]) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += digits[i] * weights2[i];
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  if (secondDigit !== digits[13]) return false;

  return true;
}

export function validateDocument(value: string): boolean {
  if (!value || value.trim() === "") return true;

  const digits = value.replace(/\D/g, "");

  if (digits.length === 11) return validateCPF(digits);
  if (digits.length === 14) return validateCNPJ(digits);

  return false;
}
