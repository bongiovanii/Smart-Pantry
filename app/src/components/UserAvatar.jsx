import { getUserAvatarUrl, getUserName } from '../lib/auth.js'

function UserAvatar({ user, className = 'h-10 w-10', textClassName = 'text-base' }) {
  const avatarUrl = getUserAvatarUrl(user)
  const name = getUserName(user)
  const initial = name.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'U'

  if (avatarUrl) {
    return (
      <img
        alt={`Foto de ${name}`}
        className={`${className} shrink-0 rounded-full object-cover`}
        referrerPolicy="no-referrer"
        src={avatarUrl}
      />
    )
  }

  return (
    <div
      className={`${className} grid shrink-0 place-items-center rounded-full bg-secondary-container font-bold text-primary ${textClassName}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}

export default UserAvatar
