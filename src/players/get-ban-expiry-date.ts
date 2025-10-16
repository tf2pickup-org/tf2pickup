import { add, parse } from 'date-fns'
import type { BanExpiryForm } from './types/ban-expiry-form'

export function getBanExpiryDate(banExpiryForm: BanExpiryForm): Date {
  switch (banExpiryForm.lengthSelector) {
    case 'date': {
      return parse(banExpiryForm.date, "yyyy-MM-dd'T'HH:mm", new Date())
    }

    case 'duration': {
      return add(new Date(), { [banExpiryForm.durationUnits]: banExpiryForm.duration })
    }

    case 'forever': {
      return add(new Date(), { years: 100 })
    }
  }
}
