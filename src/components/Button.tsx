import type { ButtonHTMLAttributes } from 'react'
import { baseButton, variants, type Variant } from './buttonStyles'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${baseButton} ${variants[variant]} ${className}`} {...props} />
}
