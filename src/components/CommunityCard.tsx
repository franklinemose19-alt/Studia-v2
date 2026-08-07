{/* Community Section */}
<div className="mt-6 space-y-4">

  {/* STUDIA Channel */}
  <div className="rounded-2xl border border-green-200 bg-white p-5">
    <div className="flex items-center gap-3 mb-3">
      <ExternalLink className="w-6 h-6 text-green-600" />
      <h3 className="text-xl font-bold text-gray-900">
        📢 STUDIA Channel
      </h3>
    </div>

    <p className="text-gray-600 leading-relaxed">
      Follow the official STUDIA Channel to receive announcements about new
      features, updates, releases, maintenance notices, study tips, and
      important news.
    </p>

    <a
      href={CHANNEL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center justify-center rounded-xl bg-green-500 px-5 py-3 font-semibold text-white hover:bg-green-600 transition"
    >
      Follow Channel
    </a>
  </div>

  {/* STUDIA Group */}
  <div className="rounded-2xl border border-green-200 bg-white p-5">
    <div className="flex items-center gap-3 mb-3">
      <MessageCircle className="w-6 h-6 text-green-600" />
      <h3 className="text-xl font-bold text-gray-900">
        💬 STUDIA Group
      </h3>
    </div>

    <p className="text-gray-600 leading-relaxed">
      Join the STUDIA Group to ask questions, report bugs, request new
      features, receive study help, share notes, and interact with other
      students and the STUDIA team.
    </p>

    <a
      href={GROUP}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center justify-center rounded-xl bg-green-500 px-5 py-3 font-semibold text-white hover:bg-green-600 transition"
    >
      Join Group
    </a>
  </div>

</div>
