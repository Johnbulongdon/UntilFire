'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Calendar, Target, Edit, Trash2, ExternalLink, Check, X, Download, BarChart3, Trash, CheckSquare } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import toast from 'react-hot-toast'

interface Plan {
  id: string
  plan_name: string
  current_age: number
  monthly_income: number
  monthly_invest: number
  monthly_spend: number
  current_stash: number
  fire_number: number
  created_at: string
  user_id: string
}

interface PlanListProps {
  onEdit?: (plan: Plan) => void
}

export default function PlanList({ onEdit }: PlanListProps) {
  const { user } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const fetchPlans = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
      toast.error('Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('user_plans')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setPlans(prev => prev.filter(p => p.id !== id))
      toast.success('Plan deleted successfully')
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error('Failed to delete plan')
    } finally {
      setDeletingId(null)
    }
  }

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(plans.map(p => p.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }

  const selectedPlans = plans.filter(p => selectedIds.has(p.id))

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    
    const confirmMsg = `Are you sure you want to delete ${selectedIds.size} plan${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`
    if (!window.confirm(confirmMsg)) return

    setBulkDeleting(true)
    try {
      const { error } = await supabase
        .from('user_plans')
        .delete()
        .in('id', Array.from(selectedIds))

      if (error) throw error
      
      setPlans(prev => prev.filter(p => !selectedIds.has(p.id)))
      toast.success(`${selectedIds.size} plan${selectedIds.size > 1 ? 's' : ''} deleted successfully`)
      clearSelection()
    } catch (error) {
      console.error('Error bulk deleting:', error)
      toast.error('Failed to delete plans')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Export selected plans as JSON
  const handleExport = () => {
    if (selectedPlans.length === 0) return
    
    const exportData = selectedPlans.map(plan => ({
      plan_name: plan.plan_name,
      current_age: plan.current_age,
      monthly_income: plan.monthly_income,
      monthly_invest: plan.monthly_invest,
      monthly_spend: plan.monthly_spend,
      current_stash: plan.current_stash,
      fire_number: plan.fire_number,
      created_at: plan.created_at,
    }))
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fire-plans-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success(`Exported ${selectedPlans.length} plan${selectedPlans.length > 1 ? 's' : ''}`)
  }

  useEffect(() => {
    setIsClient(true)
    fetchPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Auto-exit selection mode when no items selected
  useEffect(() => {
    if (selectedIds.size === 0 && isSelectionMode) {
      setIsSelectionMode(false)
    }
  }, [selectedIds.size, isSelectionMode])

  if (!isClient) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-2xl">
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">No saved plans yet</h3>
        <p className="text-gray-500 mt-2">Create your first FIRE plan in the calculator!</p>
        <button
          onClick={fetchPlans}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Your FIRE Plans</h2>
        <div className="flex items-center gap-2">
          {!isSelectionMode ? (
            <>
              <button 
                onClick={() => setIsSelectionMode(true)}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckSquare className="w-4 h-4" />
                Select
              </button>
              <button 
                onClick={fetchPlans}
                className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Select All
              </button>
              <button 
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        {plans.map((plan) => {
          const progress = calculateProgress(plan.current_stash, plan.fire_number)
          const yearsToRetire = Math.max(0, 
            Math.log(
              (plan.fire_number - plan.current_stash) / (plan.monthly_invest * 12) / 0.07 + 1
            ) / Math.log(1 + 0.07)
          )
          const isSelected = selectedIds.has(plan.id)
          
          return (
            <div 
              key={plan.id} 
              className={`bg-white p-6 rounded-2xl shadow-lg border-2 transition-all cursor-pointer ${
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-100 shadow-blue-100' 
                  : 'border-gray-100 hover:shadow-xl'
              } ${isSelectionMode ? 'hover:border-blue-300' : ''}`}
              onClick={() => isSelectionMode && toggleSelection(plan.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  {isSelectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelection(plan.id)
                      }}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{plan.plan_name}</h3>
                    <div className="flex items-center text-gray-600 text-sm mt-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(plan.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  Age {plan.current_age}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Monthly Income</div>
                  <div className="font-bold text-gray-800">${plan.monthly_income.toLocaleString()}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Monthly Invest</div>
                  <div className="font-bold text-green-600">${plan.monthly_invest.toLocaleString()}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Current Savings</div>
                  <div className="font-bold text-purple-600">${plan.current_stash.toLocaleString()}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Years to FIRE</div>
                  <div className="font-bold text-orange-600">{yearsToRetire.toFixed(1)}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress to ${plan.fire_number.toLocaleString()}</span>
                  <span className="font-bold">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              {!isSelectionMode && (
                <div className="flex justify-between mt-6 pt-6 border-t border-gray-100">
                  <div className="flex gap-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit?.(plan)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(plan.id)
                      }}
                      disabled={deletingId === plan.id}
                      className={`text-red-500 hover:text-red-700 text-sm font-bold flex items-center transition-colors ${
                        deletingId === plan.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deletingId === plan.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <button className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center transition-colors">
                    Details
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold text-sm">
                {selectedIds.size}
              </div>
              <span className="text-sm font-medium">
                {selectedIds.size === 1 ? 'plan' : 'plans'} selected
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedIds.size >= 2 && (
                <button
                  onClick={() => setShowCompareModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  Compare
                </button>
              )}
              
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-xl text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash className="w-4 h-4" />
                {bulkDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            
            <button
              onClick={clearSelection}
              className="ml-2 p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && selectedPlans.length >= 2 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Compare Plans</h2>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Metric</th>
                      {selectedPlans.map(plan => (
                        <th key={plan.id} className="text-left py-3 px-4 font-bold text-gray-800">
                          {plan.plan_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-600">Age</td>
                      {selectedPlans.map(plan => (
                        <td key={plan.id} className="py-3 px-4 font-semibold">{plan.current_age}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-600">FIRE Number</td>
                      {selectedPlans.map(plan => (
                        <td key={plan.id} className="py-3 px-4 font-semibold text-blue-600">
                          ${plan.fire_number.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-600">Current Savings</td>
                      {selectedPlans.map(plan => (
                        <td key={plan.id} className="py-3 px-4 font-semibold text-green-600">
                          ${plan.current_stash.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-600">Monthly Income</td>
                      {selectedPlans.map(plan => (
                        <td key={plan.id} className="py-3 px-4 font-semibold">
                          ${plan.monthly_income.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-600">Monthly Investment</td>
                      {selectedPlans.map(plan => (
                        <td key={plan.id} className="py-3 px-4 font-semibold text-purple-600">
                          ${plan.monthly_invest.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-600">Monthly Spend</td>
                      {selectedPlans.map(plan => (
                        <td key={plan.id} className="py-3 px-4 font-semibold text-orange-600">
                          ${plan.monthly_spend.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-600">Progress</td>
                      {selectedPlans.map(plan => {
                        const progress = calculateProgress(plan.current_stash, plan.fire_number)
                        return (
                          <td key={plan.id} className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="font-semibold text-sm">{progress.toFixed(1)}%</span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-600">Years to FIRE</td>
                      {selectedPlans.map(plan => {
                        const years = Math.max(0, 
                          Math.log(
                            (plan.fire_number - plan.current_stash) / (plan.monthly_invest * 12) / 0.07 + 1
                          ) / Math.log(1 + 0.07)
                        )
                        return (
                          <td key={plan.id} className="py-3 px-4 font-bold text-lg text-orange-600">
                            {years.toFixed(1)} years
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
