export const calcAge = (dob?: Date | null, asOn: Date = new Date()) => {
  if (!dob) return { decimal: "", digits: "" };

  // decimal age, e.g. 34.45037645
  const decimal = Number(
    ((asOn.getTime() - dob.getTime()) / 86400000 / 365.25).toFixed(8),
  );

  // years / months / days, e.g. 34Y 5M 13D
  let y = asOn.getUTCFullYear() - dob.getUTCFullYear();
  let m = asOn.getUTCMonth() - dob.getUTCMonth();
  let dd = asOn.getUTCDate() - dob.getUTCDate();

  if (dd < 0) {
    m--;
    // days in the month before the as-on month
    dd += new Date(
      Date.UTC(asOn.getUTCFullYear(), asOn.getUTCMonth(), 0),
    ).getUTCDate();
  }
  if (m < 0) {
    y--;
    m += 12;
  }

  return { decimal, digits: `${y}Y ${m}M ${dd}D` };
};