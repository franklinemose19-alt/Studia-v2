<button
  onClick={install}
  disabled={isInstalling}
  className="flex items-center justify-center gap-2
    bg-gradient-to-r from-indigo-premium to-purple-premium
    text-white px-7 py-3.5 rounded-xl
    font-bold text-sm
    shadow-lg shadow-indigo-premium/30
    hover:scale-[1.03]
    hover:shadow-xl hover:shadow-purple-premium/30
    transition-all duration-200
    disabled:opacity-60 disabled:cursor-not-allowed"
>
  {isInstalling ? (
    <>
      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      Installing...
    </>
  ) : (
    <>
      📲 Install STUDIA AI
    </>
  )}
</button>
