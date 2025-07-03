import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, Calculator, CheckSquare, BookOpen, Users } from "lucide-react"

const resources = [
  {
    title: "Business Formation Guide",
    description: "Complete guide to choosing the right business structure for your needs.",
    icon: FileText,
    type: "PDF Guide",
    downloadUrl: "/resources/business-formation-guide.pdf",
  },
  {
    title: "Tax Planning Checklist",
    description: "Essential tax planning strategies for new businesses.",
    icon: CheckSquare,
    type: "Checklist",
    downloadUrl: "/resources/tax-planning-checklist.pdf",
  },
  {
    title: "Startup Cost Calculator",
    description: "Calculate your initial business expenses and funding needs.",
    icon: Calculator,
    type: "Tool",
    downloadUrl: "/resources/startup-cost-calculator.xlsx",
  },
  {
    title: "Compliance Calendar",
    description: "Never miss important deadlines with our compliance calendar.",
    icon: BookOpen,
    type: "Calendar",
    downloadUrl: "/resources/compliance-calendar.pdf",
  },
  {
    title: "Employee Handbook Template",
    description: "Professional employee handbook template for growing businesses.",
    icon: Users,
    type: "Template",
    downloadUrl: "/resources/employee-handbook-template.docx",
  },
]

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Business Resources</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Download our comprehensive collection of business tools, templates, and guides to help you succeed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {resources.map((resource, index) => {
            const IconComponent = resource.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {resource.type}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <a href={resource.downloadUrl} download>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Need More Help?</CardTitle>
              <CardDescription>
                Our team of experts is ready to provide personalized guidance for your business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" asChild>
                <a href="/contact">Schedule a Consultation</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
