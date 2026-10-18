import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-gray-500 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div>© {new Date().getFullYear()} Business Name</div>
          <Link
            href="https://www.novusnyc.org/"
            target="_blank"
            rel="noreferrer"
            className="text-[#F6B78D] hover:text-[#F6B78D] hover:underline"
          >
            Made by Novus
          </Link>
        </div>
        <div>Built with Volta</div>
      </div>
    </footer>
  )
}
