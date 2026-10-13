import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { barberMeApi } from '../../api/endpoints'

/** The logged-in barber's profile; `data` is null when they have not created one yet. */
export function useMyBarber() {
  return useQuery({
    queryKey: ['barber', 'me'],
    queryFn: async () => {
      try {
        return await barberMeApi.profile()
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
  })
}
