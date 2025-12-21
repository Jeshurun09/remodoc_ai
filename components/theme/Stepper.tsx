interface Step {
  title: string
  description: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {index + 1}
          </div>
          <div className="ml-4">
            <div className={`text-sm font-medium ${
              index <= currentStep ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step.title}
            </div>
            <div className="text-xs text-gray-500">{step.description}</div>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-4 ${
              index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}