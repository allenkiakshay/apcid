export default function Header({ session }: { session: any }) {
  return (
    <div className="w-full flex justify-between items-center bg-gray-100 p-5 px-16">
      <h1 className="text-2xl font-bold">
        Name: <span className="font-medium text-xl">{session?.user.name}</span>
      </h1>
      <h2 className="text-2xl font-bold">
        Hall Ticket No:{" "}
        <span className="font-medium text-xl">{session?.user.hallticket}</span>
      </h2>
    </div>
  );
}
