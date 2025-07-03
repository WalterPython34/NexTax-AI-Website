import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  FileText,
  Calculator,
  CheckSquare,
  BookOpen,
  Users,
  Play,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react"

const resources = [
  {
    title: "Business Formation Guide",
    description: "Complete guide to choosing the right business structure for your needs.",
    icon: FileText,
    type: "PDF Guide",
    downloadUrl: "/resources/business-formation-guide.pdf",
    featured: true,
  },
  {
    title: "Tax Planning Checklist",
    description: "Essential tax planning strategies for new businesses.",
    icon: CheckSquare,
    type: "Checklist",
    downloadUrl: "/resources/tax-planning-checklist.pdf",
    featured: true,
  },
  {
    title: "Startup Cost Calculator",
    description: "Calculate your initial business expenses and funding needs.",
    icon: Calculator,
    type: "Tool",
    downloadUrl: "/resources/startup-cost-calculator.xlsx",
    featured: true,
  },
  {
    title: "Compliance Calendar",
    description: "Never miss important deadlines with our compliance calendar.",
    icon: BookOpen,
    type: "Calendar",
    downloadUrl: "/resources/compliance-calendar.pdf",
    featured: false,
  },
  {
    title: "Employee Handbook Template",
    description: "Professional employee handbook template for growing businesses.",
    icon: Users,
    type: "Template",
    downloadUrl: "/resources/employee-handbook-template.docx",
    featured: false,
  },
  {
    title: "FinTech Compliance Guide",
    description: "Navigate financial technology regulations with confidence.",
    icon: FileText,
    type: "PDF Guide",
    downloadUrl: "/resources/fintech-compliance-guide.pdf",
    featured: false,
  },
]

const upcomingWebinars = [
  {
    title: "AI-Powered Business Formation: The Future is Now",
    date: "January 15, 2025",
    time: "2:00 PM EST",
    description: "Learn how AI is revolutionizing business formation and tax planning.",
    registrationUrl: "/webinar-registration",
    featured: true,
  },
  {
    title: "Tax Strategies for Tech Startups",
    date: "January 22, 2025",
    time: "1:00 PM EST",
    description: "Maximize your tax savings with proven strategies for technology companies.",
    registrationUrl: "/webinar-registration",
    featured: false,
  },
  {
    title: "Scaling Your FinTech: Compliance & Growth",
    date: "February 5, 2025",
    time: "3:00 PM EST",
    description: "Navigate regulatory requirements while scaling your financial technology business.",
    registrationUrl: "/webinar-registration",
    featured: false,
  },
]

const featuredVideos = [
  {
    title: "StartSmart GPT Demo: Launch Your Business in 48 Hours",
    duration: "12:34",
    thumbnail: "/placeholder.svg?height=200&width=350",
    videoUrl: "/videos/startsmart-demo",
    views: "2.1K",
  },
  {
    title: "Tax Planning Masterclass for Entrepreneurs",
    duration: "28:15",
    thumbnail: "/placeholder.svg?height=200&width=350",
    videoUrl: "/videos/tax-masterclass",
    views: "5.3K",
  },
  {
    title: "FinTech Regulatory Landscape 2025",
    duration: "18:42",
    thumbnail: "/placeholder.svg?height=200&width=350",
    videoUrl: "/videos/fintech-regulations",
    views: "1.8K",
  },
]

export default function ResourcesPage() {
  const featuredResources = resources.filter((r) => r.featured)
  const otherResources = resources.filter((r) => !r.featured)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 py-24">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-6">Business Resources & Learning Center</h1>
            <p className="text-xl max-w-3xl mx-auto mb-8 text-emerald-100">
              Access our comprehensive library of business tools, expert webinars, and educational content designed
              specifically for modern entrepreneurs and FinTech innovators.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-4 py-2">
                <FileText className="h-4 w-4 mr-2" />
                50+ Resources
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-4 py-2">
                <Play className="h-4 w-4 mr-2" />
                Expert Webinars
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-4 py-2">
                <Users className="h-4 w-4 mr-2" />
                10K+ Downloads
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Featured Resources */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Featured Resources</h2>
            <p className="text-slate-400 text-lg">Essential tools to launch and grow your business</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredResources.map((resource, index) => {
              const IconComponent = resource.icon
              return (
                <Card
                  key={index}
                  className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 hover:scale-105"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-emerald-600/20 rounded-lg">
                        <IconComponent className="h-6 w-6 text-emerald-400" />
                      </div>
                      <Badge variant="outline" className="border-emerald-600 text-emerald-400">
                        {resource.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl text-white">{resource.title}</CardTitle>
                    <CardDescription className="text-slate-400">{resource.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                      <a href={resource.downloadUrl} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download Free
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Upcoming Webinars */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Upcoming Expert Webinars</h2>
            <p className="text-slate-400 text-lg">Join our live sessions with industry experts</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {upcomingWebinars.map((webinar, index) => (
              <Card
                key={index}
                className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 ${webinar.featured ? "ring-2 ring-emerald-600" : ""}`}
              >
                <CardHeader>
                  {webinar.featured && <Badge className="w-fit mb-2 bg-emerald-600 text-white">Featured</Badge>}
                  <CardTitle className="text-lg text-white">{webinar.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {webinar.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {webinar.time}
                    </div>
                  </div>
                  <CardDescription className="text-slate-400">{webinar.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" asChild>
                    <a href={webinar.registrationUrl}>
                      Register Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Featured Videos */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Featured Video Content</h2>
            <p className="text-slate-400 text-lg">Watch our expert-led tutorials and insights</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredVideos.map((video, index) => (
              <Card
                key={index}
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={video.thumbnail || "/placeholder.svg"}
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                      <Play className="h-5 w-5 mr-2" />
                      Watch Now
                    </Button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg text-white">{video.title}</CardTitle>
                  <div className="text-sm text-slate-400">{video.views} views</div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                    asChild
                  >
                    <a href={video.videoUrl}>
                      <Play className="h-4 w-4 mr-2" />
                      Watch Video
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Additional Resources */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Additional Resources</h2>
            <p className="text-slate-400 text-lg">More tools and templates for your business journey</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {otherResources.map((resource, index) => {
              const IconComponent = resource.icon
              return (
                <Card
                  key={index}
                  className="bg-slate-800/30 border-slate-700 hover:bg-slate-800/50 transition-all duration-300"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-slate-700 rounded-lg">
                        <IconComponent className="h-5 w-5 text-slate-300" />
                      </div>
                      <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                        {resource.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-white">{resource.title}</CardTitle>
                    <CardDescription className="text-slate-400 text-sm">{resource.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                      asChild
                    >
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
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-600/30 p-8">
            <CardHeader>
              <CardTitle className="text-2xl text-white mb-4">Ready to Launch Your Business?</CardTitle>
              <CardDescription className="text-slate-300 text-lg mb-6">
                Get personalized guidance from our AI-powered business formation platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                  <a href="/startsmart-gpt">
                    Try StartSmart GPT
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  asChild
                >
                  <a href="/contact">Schedule Consultation</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

