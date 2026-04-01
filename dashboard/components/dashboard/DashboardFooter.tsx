export default function DashboardFooter() {
  return (
    <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-[#ff7c6f18] pt-6">
      <div className="flex items-center gap-3">
        <p className="font-mono text-[13px] text-white/25">
          Actant · Operator Dashboard
        </p>
      </div>

      <p className="font-mono text-[12px] text-white/15">
        ERC-4337 execution accounts · ERC-8004 agent identity · Base L2
      </p>
    </div>
  )
}
