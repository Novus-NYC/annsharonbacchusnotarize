export default function HomePage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">
        Welcome to Business Name
      </h1>

      <p className="text-lg text-gray-600">
        Replace this section with a strong value proposition.
      </p>

      <div className="flex gap-4">
        <button className="px-6 py-3 bg-black text-white rounded-md">
          Primary Action
        </button>

        <button className="px-6 py-3 border rounded-md">
          Secondary Action
        </button>
      </div>
    </div>
  )
}
