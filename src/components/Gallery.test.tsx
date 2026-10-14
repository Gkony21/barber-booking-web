import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { Gallery } from './Gallery'

const photos = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, url: `/media/${i + 1}.jpg`, caption: i === 2 ? 'Skin fade #0' : null }))

it('shows six photos, expands to all, and opens one full screen', async () => {
  render(<Gallery title="Η δουλειά του" photos={photos} />)
  const user = userEvent.setup()

  expect(screen.getAllByRole('button', { name: /Φωτογραφία \d+ από 8/ })).toHaveLength(6)
  await user.click(screen.getByRole('button', { name: '+2' }))
  expect(screen.getAllByRole('button', { name: /Φωτογραφία \d+ από 8/ })).toHaveLength(8)

  await user.click(screen.getByRole('button', { name: 'Φωτογραφία 3 από 8: Skin fade #0' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('3 / 8')
  expect(screen.getByRole('dialog')).toHaveTextContent('Skin fade #0')

  await user.click(screen.getByRole('button', { name: 'Επόμενη' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('4 / 8')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('renders nothing without photos', () => {
  const { container } = render(<Gallery title="Η δουλειά του" photos={[]} />)
  expect(container).toBeEmptyDOMElement()
})
