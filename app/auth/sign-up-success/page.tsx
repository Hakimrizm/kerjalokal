import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, MailCheck } from "lucide-react";

// Halaman ini membaca searchParams (email) pada request.
// Next.js 16 perlu diberi tahu agar route ini tidak dipaksa
// menggunakan prerendering statis.
export const instant = false;

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ECF0F1] px-4 py-10">
      <div className="card w-full max-w-lg border border-[#BDC3C7]/70 bg-white shadow-xl shadow-[#2C3E50]/5">
        <div className="card-body items-center p-7 text-center sm:p-10">
          <div className="mb-2 grid h-16 w-16 place-items-center rounded-2xl bg-[#ECF0F1] text-[#2C3E50]">
            <MailCheck size={32} />
          </div>

          <div className="mb-2 flex items-center gap-2 text-sm font-extrabold tracking-tight text-[#2C3E50]">
            <BriefcaseBusiness size={17} />
            kerja<span className="-ml-2 text-[#7F8C8D]">lokal</span>
          </div>

          <span className="badge badge-outline border-[#BDC3C7] bg-[#ECF0F1] px-3 py-3 text-[10px] font-bold tracking-wider text-[#34495E]">
            SATU LANGKAH LAGI
          </span>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#2C3E50] sm:text-3xl">
            Periksa email kamu
          </h1>

          <p className="mt-2 max-w-sm text-sm leading-6 text-[#7F8C8D]">
            Kami telah mengirimkan tautan verifikasi akun.
            {email ? (
              <>
                {" "}Silakan periksa kotak masuk{" "}
                <strong className="break-all text-[#34495E]">{email}</strong>.
              </>
            ) : (
              " Silakan periksa kotak masuk email yang kamu daftarkan."
            )}
          </p>

          <div className="alert mt-5 rounded-xl border border-[#BDC3C7]/70 bg-[#ECF0F1] text-left text-xs leading-5 text-[#53616D]">
            Setelah email dikonfirmasi, kamu akan diarahkan untuk melengkapi
            profil pencari kerja melalui lima tahap. Jika email belum terlihat,
            periksa folder spam atau junk.
          </div>

          <Link
            href="/auth/login"
            className="btn btn-primary mt-5 min-h-12 w-full rounded-xl border-0 bg-[#2C3E50] text-white hover:bg-[#34495E]"
          >
            Kembali ke halaman masuk <ArrowRight size={17} />
          </Link>

          <Link
            href="/"
            className="mt-2 text-xs font-semibold text-[#7F8C8D] hover:text-[#2C3E50]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
