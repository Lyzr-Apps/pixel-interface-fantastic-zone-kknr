'use client'

import React, { useState, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { FiFileText, FiDownload, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiXCircle } from 'react-icons/fi'

// --- Constants ---

const AGENT_ID = '6997ec8577b90295a058d617'
const AGENT_NAME = 'Vendor PDF Generator Agent'

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia',
  'Japan', 'India', 'Brazil', 'Mexico', 'China', 'South Korea', 'Italy',
  'Spain', 'Netherlands', 'Switzerland', 'Sweden', 'Singapore', 'Ireland',
  'New Zealand', 'South Africa', 'United Arab Emirates', 'Other'
]

const BUSINESS_TYPES = [
  'Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Non-Profit', 'Government', 'Other'
]

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education', 'Construction', 'Other'
]

const REVENUE_RANGES = [
  'Under $1M', '$1M-$5M', '$5M-$25M', '$25M-$100M', 'Over $100M'
]

const SAMPLE_DATA = {
  companyName: 'Pinnacle Solutions Inc.',
  registrationNumber: 'REG-2024-78432',
  taxId: '47-1234567',
  address: '1200 Innovation Drive, Suite 450',
  city: 'Austin',
  state: 'Texas',
  zipCode: '78701',
  country: 'United States',
  primaryContactName: 'Sarah Mitchell',
  jobTitle: 'VP of Procurement',
  email: 'sarah.mitchell@pinnaclesolutions.com',
  phone: '+1 (512) 555-0198',
  secondaryContactName: 'David Chen',
  secondaryEmail: 'david.chen@pinnaclesolutions.com',
  businessType: 'Corporation',
  industry: 'Technology',
  annualRevenue: '$5M-$25M',
  paymentTerms: 'net30',
  paymentMethod: 'bank_transfer',
}

const EMPTY_FORM = {
  companyName: '',
  registrationNumber: '',
  taxId: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  primaryContactName: '',
  jobTitle: '',
  email: '',
  phone: '',
  secondaryContactName: '',
  secondaryEmail: '',
  businessType: '',
  industry: '',
  annualRevenue: '',
  paymentTerms: '',
  paymentMethod: '',
}

// --- Types ---

interface FormData {
  companyName: string
  registrationNumber: string
  taxId: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  primaryContactName: string
  jobTitle: string
  email: string
  phone: string
  secondaryContactName: string
  secondaryEmail: string
  businessType: string
  industry: string
  annualRevenue: string
  paymentTerms: string
  paymentMethod: string
}

interface AgentResult {
  status?: string
  message?: string
  document_title?: string
  vendor_name?: string
}

interface ValidationErrors {
  [key: string]: string
}

// --- Error Boundary ---

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// --- Helper: validate email ---

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// --- Section Components ---

function SectionHeader({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">{number}</span>
        <div>
          <CardTitle className="font-serif text-lg font-semibold tracking-tight">{title}</CardTitle>
          <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  )
}

function FormField({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className ?? ''}>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-destructive text-xs mt-1 flex items-center gap-1">
          <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function CompanyDetailsSection({
  formData,
  onChange,
  errors,
  disabled,
}: {
  formData: FormData
  onChange: (field: keyof FormData, value: string) => void
  errors: ValidationErrors
  disabled: boolean
}) {
  return (
    <Card className="border-border/60">
      <SectionHeader number={1} title="Company Details" description="Legal entity and address information" />
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormField label="Company Name" required error={errors.companyName}>
            <Input
              placeholder="e.g. Acme Corporation"
              value={formData.companyName}
              onChange={(e) => onChange('companyName', e.target.value)}
              disabled={disabled}
              className={errors.companyName ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
          </FormField>
          <FormField label="Registration Number">
            <Input
              placeholder="e.g. REG-2024-12345"
              value={formData.registrationNumber}
              onChange={(e) => onChange('registrationNumber', e.target.value)}
              disabled={disabled}
            />
          </FormField>
          <FormField label="Tax ID / EIN" className="md:col-span-1">
            <Input
              placeholder="e.g. 12-3456789"
              value={formData.taxId}
              onChange={(e) => onChange('taxId', e.target.value)}
              disabled={disabled}
            />
          </FormField>
          <div className="md:col-span-1" />
          <FormField label="Address" className="md:col-span-2">
            <Input
              placeholder="e.g. 123 Business Ave, Suite 100"
              value={formData.address}
              onChange={(e) => onChange('address', e.target.value)}
              disabled={disabled}
            />
          </FormField>
          <FormField label="City">
            <Input
              placeholder="e.g. San Francisco"
              value={formData.city}
              onChange={(e) => onChange('city', e.target.value)}
              disabled={disabled}
            />
          </FormField>
          <FormField label="State / Province">
            <Input
              placeholder="e.g. California"
              value={formData.state}
              onChange={(e) => onChange('state', e.target.value)}
              disabled={disabled}
            />
          </FormField>
          <FormField label="Zip / Postal Code">
            <Input
              placeholder="e.g. 94105"
              value={formData.zipCode}
              onChange={(e) => onChange('zipCode', e.target.value)}
              disabled={disabled}
            />
          </FormField>
          <FormField label="Country">
            <Select
              value={formData.country}
              onValueChange={(val) => onChange('country', val)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}

function ContactInfoSection({
  formData,
  onChange,
  errors,
  disabled,
}: {
  formData: FormData
  onChange: (field: keyof FormData, value: string) => void
  errors: ValidationErrors
  disabled: boolean
}) {
  return (
    <Card className="border-border/60">
      <SectionHeader number={2} title="Contact Information" description="Primary and secondary contacts" />
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormField label="Primary Contact Name" required error={errors.primaryContactName}>
            <Input
              placeholder="e.g. John Smith"
              value={formData.primaryContactName}
              onChange={(e) => onChange('primaryContactName', e.target.value)}
              disabled={disabled}
              className={errors.primaryContactName ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
          </FormField>
          <FormField label="Job Title">
            <Input
              placeholder="e.g. VP of Procurement"
              value={formData.jobTitle}
              onChange={(e) => onChange('jobTitle', e.target.value)}
              disabled={disabled}
            />
          </FormField>
          <FormField label="Email Address" required error={errors.email}>
            <Input
              type="email"
              placeholder="e.g. john@company.com"
              value={formData.email}
              onChange={(e) => onChange('email', e.target.value)}
              disabled={disabled}
              className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
          </FormField>
          <FormField label="Phone Number" required error={errors.phone}>
            <Input
              type="tel"
              placeholder="e.g. +1 (555) 123-4567"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              disabled={disabled}
              className={errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
          </FormField>
          <Separator className="md:col-span-2 my-2" />
          <FormField label="Secondary Contact Name">
            <Input
              placeholder="e.g. Jane Doe"
              value={formData.secondaryContactName}
              onChange={(e) => onChange('secondaryContactName', e.target.value)}
              disabled={disabled}
            />
          </FormField>
          <FormField label="Secondary Email">
            <Input
              type="email"
              placeholder="e.g. jane@company.com"
              value={formData.secondaryEmail}
              onChange={(e) => onChange('secondaryEmail', e.target.value)}
              disabled={disabled}
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}

function BusinessDetailsSection({
  formData,
  onChange,
  errors,
  disabled,
}: {
  formData: FormData
  onChange: (field: keyof FormData, value: string) => void
  errors: ValidationErrors
  disabled: boolean
}) {
  return (
    <Card className="border-border/60">
      <SectionHeader number={3} title="Business Details" description="Classification, revenue, and payment preferences" />
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormField label="Business Type">
            <Select
              value={formData.businessType}
              onValueChange={(val) => onChange('businessType', val)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((bt) => (
                  <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Industry">
            <Select
              value={formData.industry}
              onValueChange={(val) => onChange('industry', val)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Annual Revenue" className="md:col-span-2">
            <Select
              value={formData.annualRevenue}
              onValueChange={(val) => onChange('annualRevenue', val)}
              disabled={disabled}
            >
              <SelectTrigger className="md:w-1/2">
                <SelectValue placeholder="Select revenue range" />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_RANGES.map((rev) => (
                  <SelectItem key={rev} value={rev}>{rev}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <Separator className="md:col-span-2 my-2" />

          <FormField label="Payment Terms" className="md:col-span-2">
            <RadioGroup
              value={formData.paymentTerms}
              onValueChange={(val) => onChange('paymentTerms', val)}
              disabled={disabled}
              className="flex flex-wrap gap-6 mt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="net30" id="net30" />
                <Label htmlFor="net30" className="text-sm font-normal cursor-pointer">Net 30</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="net45" id="net45" />
                <Label htmlFor="net45" className="text-sm font-normal cursor-pointer">Net 45</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="net60" id="net60" />
                <Label htmlFor="net60" className="text-sm font-normal cursor-pointer">Net 60</Label>
              </div>
            </RadioGroup>
          </FormField>

          <FormField label="Preferred Payment Method" className="md:col-span-2">
            <RadioGroup
              value={formData.paymentMethod}
              onValueChange={(val) => onChange('paymentMethod', val)}
              disabled={disabled}
              className="flex flex-wrap gap-6 mt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="text-sm font-normal cursor-pointer">Bank Transfer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="check" id="check" />
                <Label htmlFor="check" className="text-sm font-normal cursor-pointer">Check</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit_card" id="credit_card" />
                <Label htmlFor="credit_card" className="text-sm font-normal cursor-pointer">Credit Card</Label>
              </div>
            </RadioGroup>
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultBanner({
  result,
  pdfUrl,
  error,
  onRetry,
}: {
  result: AgentResult | null
  pdfUrl: string
  error: string
  onRetry: () => void
}) {
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
        <FiXCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">PDF generation failed</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button
            onClick={onRetry}
            className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
          >
            <FiRefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="rounded-lg border border-green-300/60 bg-green-50/50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex items-start gap-3 flex-1">
        <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">
            {result?.message ?? 'Document generated successfully'}
          </p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {result?.document_title && (
              <Badge variant="secondary" className="text-xs font-normal">
                {result.document_title}
              </Badge>
            )}
            {result?.vendor_name && (
              <Badge variant="outline" className="text-xs font-normal">
                {result.vendor_name}
              </Badge>
            )}
            {result?.status && (
              <Badge variant="outline" className="text-xs font-normal capitalize">
                {result.status}
              </Badge>
            )}
          </div>
        </div>
      </div>
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <FiDownload className="w-4 h-4" />
          Download PDF
        </a>
      )}
    </div>
  )
}

function AgentStatusBar({ isActive }: { isActive: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <FiFileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">{AGENT_NAME}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
        <span className="text-xs text-muted-foreground">{isActive ? 'Processing' : 'Ready'}</span>
      </div>
    </div>
  )
}

// --- Main Page ---

export default function Page() {
  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [loading, setLoading] = useState(false)
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [sampleDataOn, setSampleDataOn] = useState(false)

  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user types
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return prev
    })
  }, [])

  const handleSampleToggle = useCallback((checked: boolean) => {
    setSampleDataOn(checked)
    if (checked) {
      setFormData({ ...SAMPLE_DATA })
      setErrors({})
    } else {
      setFormData({ ...EMPTY_FORM })
    }
    // Clear previous results
    setAgentResult(null)
    setPdfUrl('')
    setErrorMessage('')
  }, [])

  const validate = useCallback((): boolean => {
    const newErrors: ValidationErrors = {}
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }
    if (!formData.primaryContactName.trim()) {
      newErrors.primaryContactName = 'Primary contact name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const buildMessage = useCallback((): string => {
    const paymentTermsLabel = formData.paymentTerms === 'net30' ? 'Net 30' : formData.paymentTerms === 'net45' ? 'Net 45' : formData.paymentTerms === 'net60' ? 'Net 60' : ''
    const paymentMethodLabel = formData.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : formData.paymentMethod === 'check' ? 'Check' : formData.paymentMethod === 'credit_card' ? 'Credit Card' : ''

    return `Generate a professional Vendor Onboarding PDF with the following details:

Company Details:
- Company Name: ${formData.companyName}
- Registration Number: ${formData.registrationNumber || 'N/A'}
- Tax ID/EIN: ${formData.taxId || 'N/A'}
- Address: ${formData.address || 'N/A'}
- City: ${formData.city || 'N/A'}
- State: ${formData.state || 'N/A'}
- Zip Code: ${formData.zipCode || 'N/A'}
- Country: ${formData.country || 'N/A'}

Contact Information:
- Primary Contact: ${formData.primaryContactName}
- Job Title: ${formData.jobTitle || 'N/A'}
- Email: ${formData.email}
- Phone: ${formData.phone}
- Secondary Contact: ${formData.secondaryContactName || 'N/A'}
- Secondary Email: ${formData.secondaryEmail || 'N/A'}

Business Details:
- Business Type: ${formData.businessType || 'N/A'}
- Industry: ${formData.industry || 'N/A'}
- Annual Revenue: ${formData.annualRevenue || 'N/A'}
- Payment Terms: ${paymentTermsLabel || 'N/A'}
- Preferred Payment Method: ${paymentMethodLabel || 'N/A'}`
  }, [formData])

  const handleGenerate = useCallback(async () => {
    if (!validate()) return

    setLoading(true)
    setAgentResult(null)
    setPdfUrl('')
    setErrorMessage('')

    try {
      const message = buildMessage()
      const result: AIAgentResponse = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const agentData: AgentResult = {
          status: result?.response?.result?.status ?? '',
          message: result?.response?.result?.message ?? result?.response?.message ?? 'Document generated',
          document_title: result?.response?.result?.document_title ?? '',
          vendor_name: result?.response?.result?.vendor_name ?? '',
        }
        setAgentResult(agentData)

        const artifactFiles = result?.module_outputs?.artifact_files
        if (Array.isArray(artifactFiles) && artifactFiles.length > 0) {
          const fileUrl = artifactFiles[0]?.file_url ?? ''
          setPdfUrl(fileUrl)
        }
      } else {
        setErrorMessage(result?.error ?? result?.response?.message ?? 'An unexpected error occurred. Please try again.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [validate, buildMessage])

  const handleReset = useCallback(() => {
    setFormData(sampleDataOn ? { ...SAMPLE_DATA } : { ...EMPTY_FORM })
    setErrors({})
    setAgentResult(null)
    setPdfUrl('')
    setErrorMessage('')
  }, [sampleDataOn])

  const isFormValid = formData.companyName.trim() !== '' && formData.primaryContactName.trim() !== '' && formData.email.trim() !== '' && formData.phone.trim() !== ''

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border/60 bg-card">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FiFileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-semibold tracking-tight">Vendor Onboarding</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Generate professional onboarding documents</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={sampleDataOn}
                onCheckedChange={handleSampleToggle}
                disabled={loading}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* Result / Error Banner */}
          <ResultBanner
            result={agentResult}
            pdfUrl={pdfUrl}
            error={errorMessage}
            onRetry={handleGenerate}
          />

          {/* Section 1: Company Details */}
          <CompanyDetailsSection
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
            disabled={loading}
          />

          {/* Section 2: Contact Information */}
          <ContactInfoSection
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
            disabled={loading}
          />

          {/* Section 3: Business Details */}
          <BusinessDetailsSection
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
            disabled={loading}
          />

          {/* Generate Button + Reset */}
          <div className="space-y-3">
            <Button
              onClick={handleGenerate}
              disabled={loading || !isFormValid}
              className="w-full h-12 text-sm font-semibold shadow-sm"
              size="lg"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 w-4 h-4" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FiFileText className="mr-2 w-4 h-4" />
                  Generate Vendor Onboarding PDF
                </>
              )}
            </Button>

            {(agentResult || errorMessage) && (
              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  disabled={loading}
                >
                  <FiRefreshCw className="w-3 h-3" />
                  Reset form and start over
                </button>
              </div>
            )}
          </div>

          {/* Agent Status */}
          <AgentStatusBar isActive={loading} />
        </main>
      </div>
    </ErrorBoundary>
  )
}
