import { Bug, Megaphone, ChevronRight } from 'lucide-react'

const GROUP_LINK =
  'https://chat.whatsapp.com/HgWYXeqcuCqEgr8ScsvM0W'

const CHANNEL_LINK =
  'https://whatsapp.com/channel/0029Vb7zmZhLdQedTssbhB3B'

interface Props {
  variant?: 'light' | 'dark'
}

export default function CommunityCard({
  variant = 'light',
}: Props) {
  const dark = variant === 'dark'

  return (
    <div
      className={[
        'rounded-2xl border-2 overflow-hidden',
        dark
          ? 'bg-[#128C7E]/10 border-[#25D366]/20'
          : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
      ].join(' ')}
    >
      {/* Header */}
      <div className="px-5 py-5 sm:px-6">
        <h3
          className={[
            'font-sora font-bold text-xl',
            dark ? 'text-white' : 'text-navy',
          ].join(' ')}
        >
          Join the STUDIA Community
        </h3>

        <p
          className={[
            'mt-2 text-sm',
            dark ? 'text-[#8B97B5]' : 'text-gray-600',
          ].join(' ')}
        >
          Stay connected with other students and the STUDIA team.
        </p>
      </div>

      {/* Links */}
      <div
        className={
          dark
            ? 'border-t border-white/10'
            : 'border-t border-green-200'
        }
      >
        <a
          href={GROUP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            'flex items-center gap-3 px-5 py-4 transition',
            dark ? 'hover:bg-white/5' : 'hover:bg-white/40',
          ].join(' ')}
        >
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 flex items-center justify-center">
            <Bug size={18} className="text-[#25D366]" />
          </div>

          <div className="flex-1">
            <p
              className={[
                'font-semibold',
                dark ? 'text-white' : 'text-navy',
              ].join(' ')}
            >
              Report Bugs & Get Help
            </p>

            <p
              className={[
                'text-xs',
                dark ? 'text-[#8B97B5]' : 'text-gray-500',
              ].join(' ')}
            >
              Join the WhatsApp Group
            </p>
          </div>

          <ChevronRight
            size={18}
            className={dark ? 'text-white' : 'text-gray-400'}
          />
        </a>

        <div
          className={
            dark
              ? 'border-t border-white/10'
              : 'border-t border-green-200'
          }
        />

        <a
          href={CHANNEL_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            'flex items-center gap-3 px-5 py-4 transition',
            dark ? 'hover:bg-white/5' : 'hover:bg-white/40',
          ].join(' ')}
        >
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 flex items-center justify-center">
            <Megaphone size={18} className="text-[#25D366]" />
          </div>

          <div className="flex-1">
            <p
              className={[
                'font-semibold',
                dark ? 'text-white' : 'text-navy',
              ].join(' ')}
            >
              New Features & Updates
            </p>

            <p
              className={[
                'text-xs',
                dark ? 'text-[#8B97B5]' : 'text-gray-500',
              ].join(' ')}
            >
              Follow the WhatsApp Channel
            </p>
          </div>

          <ChevronRight
            size={18}
            className={dark ? 'text-white' : 'text-gray-400'}
          />
        </a>
      </div>
    </div>
  )
}
