import React from 'react';
import { Check, CreditCard, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DEFAULT_PLANS } from '../../services/firestoreService';

export const SubscriptionView: React.FC = () => {
  const { t } = useLanguage();
  const { activeOrg, domains, plans } = useAuth();

  const planList = plans.length > 0 ? plans : DEFAULT_PLANS;
  const activePlanId = activeOrg?.plan || 'free';
  const activePlan = planList.find((p) => p.id === activePlanId) || planList[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{t.appNav.subscription}</h1>
        <p className="text-xs text-slate-400 mt-1">
          Transparent subscription quotas enforced at the organization level.
        </p>
      </div>

      {/* Current Subscription Summary */}
      <div className="bg-[#101D35] border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#22D3EE] font-semibold">
            <CreditCard className="w-4 h-4" />
            Active Organization Plan
          </div>
          <h2 className="text-2xl font-bold text-white">{activePlan.name}</h2>
          <p className="text-xs text-slate-300 tabular-nums">
            {activePlan.priceTnd === 0 ? 'Free' : `${activePlan.priceTnd} TND / month`} · Domain usage:{' '}
            <strong>
              {domains.length} / {activeOrg?.domainLimit || activePlan.domainLimit}
            </strong>{' '}
            · Daily scan quota: <strong>{activeOrg?.scanQuotaDaily || activePlan.dailyScanQuota}</strong>
          </p>
        </div>
        <div className="text-xs text-slate-300 space-y-1">
          <div>
            Scheduled Scans: <strong className="capitalize text-white">{activePlan.scheduleAllowed}</strong>
          </div>
          <div>
            Executive PDF Tier: <strong className="text-white">{activePlan.pdfReportsEnabled ? 'Included' : 'Standard Trial Export'}</strong>
          </div>
        </div>
      </div>

      <div className="bg-[#0D1628] border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-[#00C8E8] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Online Tunisian payment gateways (Konnect / Flouci) remain disabled until merchant credentials are configured. Platform administrators can upgrade or customize organization quotas directly from the Admin Panel or upon onboarding request.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {planList.map((plan) => {
          const isCurrent = plan.id === activePlanId;
          return (
            <div
              key={plan.id}
              className={`rounded-xl p-5 border flex flex-col justify-between space-y-4 ${
                isCurrent ? 'bg-[#101D35] border-[#00C8E8]' : 'bg-[#0D1628] border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  {isCurrent && <span className="text-xs font-semibold text-[#22D3EE]">Current</span>}
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {plan.priceTnd === 0 ? '0 TND' : `${plan.priceTnd} TND`}
                  <span className="text-xs font-normal text-slate-400"> / mo</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#00C8E8]" />
                    Up to {plan.domainLimit} verified {plan.domainLimit === 1 ? 'domain' : 'domains'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#00C8E8]" />
                    {plan.dailyScanQuota} scans / day
                  </li>
                  <li className="flex items-center gap-2 capitalize">
                    <Check className="w-3.5 h-3.5 text-[#00C8E8]" />
                    Schedule: {plan.scheduleAllowed}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#00C8E8]" />
                    EN & FR PDF Reports: {plan.pdfReportsEnabled ? 'Yes' : 'Basic'}
                  </li>
                </ul>
              </div>
              <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                {isCurrent ? 'Active on this workspace' : 'Contact sales / admin to assign'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
