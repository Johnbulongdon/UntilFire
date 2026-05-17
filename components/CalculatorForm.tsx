'use client'

import { useState, useEffect } from 'react'
import { Calculator, Target, Calendar, TrendingUp, Save, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import toast from 'react-hot-toast'

interface CalculatorFormProps {
  initialData?: any
  onSave?: () => void
}

export default function CalculatorForm({ initialData, onSave }: CalculatorFormProps) {
  const { user } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [inputs, setInputs] = useState({
    planName: initialData?.plan_name || 'My FIRE Plan',
    age: initialData?.current_age || 30,
    income: initialData?.monthly_income || 5000,
    invest: initialData?.monthly_invest || 1000,
    spend: initialData?.monthly_spend || 3000,
    stash: initialData?.current_stash || 50000
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    setIsClient(true)
    
    if (initialData) {
      setInputs({
        planName: initialData.plan_name,
        age: initialData.current_age,
        income: initialData.monthly_income,
        invest: initialData.monthly_invest,
        spend: initialData.monthly_spend,
        stash: initialData.current_stash
      })
    }
  }, [initialData])

  useEffect(() => {
    if (!isClient) return
  }, [isClient])

  if (!isClient) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleChange = (field: string, value: string | number) => {
    setInputs(prev => ({
      ...prev,
      [field]: field === 'planName' ? value : (parseInt(value as string) || 0)
    }))
  }

  const fireNumber = inputs.spend * 12 * 25
  const yearsToFIRE = Math.max(0, Math.log((fireNumber - inputs.stash) / (inputs.invest * 12) / 0.07 + 1) / Math.log(1 + 0.07))
  const retirementAge = inputs.age + Math.max(0, yearsToFIRE)
  const progressPercent = Math.min((inputs.stash / fireNumber) * 100, 100)

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save your plan')
      return
    }

    setIsSaving(true)
    setSaveMessage('Saving your plan...')
    
    try {
      const planData: any = {
        user_id: user.id,
        plan_name: inputs.planName,
        current_age: inputs.age,
        monthly_income: inputs.income,
        monthly_invest: inputs.invest,
        monthly_spend: inputs.spend,
        current_stash: inputs.stash,
        fire_number: fireNumber,
        expected_return: 7.0,
        withdrawal_rate: 4.0
      }

      if (initialData?.id) {
        planData.id = initialData.id
      }
      
      const { error } = await supabase
        .from('user_plans')
        .upsert([planData])
        .select()
      
      if (error) {
        throw error
      } else {
        toast.success(initialData?.id ? 'Plan updated!' : 'Plan saved!')
        setSaveMessage(initialData?.id ? '✅ Plan updated!' : '✅ Plan saved!')
        if (onSave) onSave()
        setTimeout(() => setSaveMessage(''), 3000)
      }
    } catch (err: any) {
      console.error('❌ Save error:', err)
      toast.error(`Save failed: ${err.message}`)
      setSaveMessage(`❌ Error: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="text-center mb-8">
        <Calculator className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">{initialData ? 'Edit FIRE Plan' : 'FIRE Calculator'}</h2>
        <p className="text-gray-600 mt-2">Adjust the sliders to see your financial future</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="font-medium text-gray-700">Plan Name</label>
            <input
              type="text"
              value={inputs.planName}
              onChange={(e) => handleChange('planName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Early Retirement Plan"
            />
          </div>

          {[
            { label: 'Current Age', field: 'age', icon: '👤', min: 20, max: 70, step: 1 },
            { label: 'Monthly Income ($)', field: 'income', icon: '💰', min: 1000, max: 50000, step: 100 },
            { label: 'Monthly Investment ($)', field: 'invest', icon: '📈', min: 0, max: 10000, step: 100 },
            { label: 'Monthly Spending ($)', field: 'spend', icon: '💸', min: 1000, max: 20000, step: 100 },
            { label: 'Current Savings ($)', field: 'stash', icon: '🏦', min: 0, max: 1000000, step: 1000 },
          ].map(({ label, field, icon, min, max, step }) => (
            <div key={field} className="space-y-3">
              <div className="flex justify-between">
                <label className="font-medium text-gray-700">
                  <span className="mr-2">{icon}</span>
                  {label}
                </label>
                <span className="font-bold text-blue-600">
                  ${(inputs as any)[field].toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={(inputs as any)[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>${min.toLocaleString()}</span>
                <span>${max.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
            <div className="flex items-center mb-4">
              <Target className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-800">FIRE Number</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              ${fireNumber.toLocaleString()}
            </div>
            <p className="text-gray-600 text-sm">
              Amount needed to retire (25× annual expenses)
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-6 rounded-2xl border border-green-200">
            <div className="flex items-center mb-4">
              <Calendar className="w-6 h-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-800">Time to FIRE</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {yearsToFIRE.toFixed(1)} years
            </div>
            <p className="text-gray-600 text-sm">
              You can retire at age <span className="font-semibold">{retirementAge.toFixed(1)}</span>
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-100 p-6 rounded-2xl border border-purple-200">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-6 h-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-800">Progress</h3>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Current: ${inputs.stash.toLocaleString()}</span>
                <span>Target: ${fireNumber.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {progressPercent.toFixed(1)}%
            </div>
            <p className="text-gray-600 text-sm">of the way to FIRE!</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${
                isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {initialData ? 'Update FIRE Plan' : 'Save My FIRE Plan'}
                </>
              )}
            </button>
            
            {saveMessage && (
              <div className={`p-3 rounded-lg flex items-start gap-2 ${
                saveMessage.includes('✅') || saveMessage.includes('saved')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              }`}>
                {saveMessage.includes('✅') ? (
                  <span className="text-lg">✅</span>
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-sm">{saveMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
