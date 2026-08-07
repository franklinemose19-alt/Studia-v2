import { Bug, Megaphone, ChevronRight } from 'lucide-react'

const GROUP_LINK = 'https://chat.whatsapp.com/HgWYXeqcuCqEgr8ScsvM0W'
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7zmZhLdQedTssbhB3B'

interface Props {
  variant?: 'light' | 'dark'
}

export default function CommunityCard({ variant = 'light' }: Props) {
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
      <div className="p-5 sm:p-6 pb-4">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <p className={['font-sora font-bold text-base', dark ? 'text-white' : 'text-navy'].join(' ')}>
            Join the STUDIA Community
          </p>
        </div>
        <p className={['text-sm', dark ? 'text-[#8B97B5]' : 'text-gray-600'].join(' ')}>
          Get help, report bugs, and stay updated on WhatsApp.
        </p>
      </div>

      {/* Action rows */}
      <div className={dark ? 'border-t border-white/10' : 'border-t border-green-200/60'}>
        
          href={GROUP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            'flex items-center gap-3 px-5 sm:px-6 py-4 transition',
            dark ? 'hover:bg-white/5' : 'hover:bg-white/50',
          ].join(' ')}
        >
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
            <Bug size={18} className="text-[#128C7E]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={['font-semibold text-sm', dark ? 'text-white' : 'text-navy'].join(' ')}>
              Report Bugs & Get Help
            </p>
            <p className={['text-xs', dark ? 'text-[#8B97B5]' : 'text-gray-500'].join(' ')}>
              Join the WhatsApp group
            </p>
          </div>
          <ChevronRight size={18} className={dark ? 'text-[#8B97B5]' : 'text-gray-400'} />
        </a>

        <div className={dark ? 'border-t border-white/10' : 'border-t border-green-200/60'} />

        
          href={CHANNEL_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            'flex items-center gap-3 px-5 sm:px-6 py-4 transition',
            dark ? 'hover:bg-white/5' : 'hover:bg-white/50',
          ].join(' ')}
        >
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
            <Megaphone size={18} className="text-[#128C7E]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={['font-semibold text-sm', dark ? 'text-white' : 'text-navy'].join(' ')}>
              New Features & Updates
            </p>
            <p className={['text-xs', dark ? 'text-[#8B97B5]' : 'text-gray-500'].join(' ')}>
              Follow the WhatsApp channel
            </p>
          </div>
          <ChevronRight size={18} className={dark ? 'text-[#8B97B5]' : 'text-gray-400'} />
        </a>
      </div>
    </div>
  )
}
