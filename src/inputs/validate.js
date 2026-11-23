const positive = (n) =>
  Number.isFinite(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER
export function validateRule(rule) {
  if (!rule || !['platform', 'brand', 'cart'].includes(rule.scope))
    throw Error('Specify a brand, platform or the entire cart.')
  if (!['percentage', 'flat'].includes(rule.type) || !positive(rule.value))
    throw Error('Specify a positive discount amount.')
  if (rule.type === 'percentage' && rule.value > 100)
    throw Error('A percentage cannot exceed 100%.')
  if (rule.type === 'flat' && !Number.isSafeInteger(rule.value))
    throw Error('Flat offers must be in whole rupees.')
  if (typeof rule.stackable !== 'boolean')
    throw Error('Stackable must be true or false.')
  if (rule.scope === 'cart') {
    if (
      rule.type !== 'percentage' ||
      !Number.isSafeInteger(rule.minCartValue) ||
      rule.minCartValue < 0 ||
      rule.appliesTo
    )
      throw Error(
        'A cart offer needs a percentage and a minimum cart value in whole rupees.',
      )
  } else if (
    typeof rule.appliesTo !== 'string' ||
    !rule.appliesTo.trim() ||
    rule.minCartValue != null
  ) {
    throw Error(
      'Item offers need a named brand or platform and cannot include a cart threshold.',
    )
  }
  return {
    scope: rule.scope,
    appliesTo: rule.appliesTo?.trim() || '',
    type: rule.type,
    value: rule.value,
    stackable: rule.stackable,
    minCartValue: rule.minCartValue ?? null,
  }
}

export function readPrice(value) {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/^(?:Rs\.?|INR|₹)\s*/i, '')
  if (
    !/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(
      cleaned,
    )
  )
    throw Error('Invalid base price.')
  const price = Math.round(Number(cleaned.replaceAll(',', '')))
  if (!Number.isSafeInteger(price) || price <= 0)
    throw Error('Base price must round to a positive whole rupee.')
  return price
}
