import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Download,
  FileText,
  Calculator,
  CheckSquare,
  Calendar,
  Users,
  Play,
  Clock,
  TrendingUp,
  BookOpen,
  Mic,
  ClipboardList,
} from "lucide-react"
import Link from "next/link"
import SimpleQuiz from "@/components/simple-quiz" // Added SimpleQuiz import

export default function ResourcesPage() {
  const featuredResources = [
    {
      icon: FileText,
      title: "The Tax-First Launch Guide: Choosing Your Optimal Entity",
      description: "Complete guide to choosing the right business structure for your needs.",
      type: "PDF Guide",
      color: "emerald",
      featured: true,
      link: "/resources/tax-first-launch-guide",
    },
    {
      icon: CheckSquare,
      title: "Tax Planning Checklist",
      description: "Essential tax planning strategies for new businesses.",
      type: "Checklist",
      color: "blue",
      featured: true,
      link: "/resources/tax-planning-checklist",
    },
    {
      icon: Calculator,
      title: "Startup Cost Calculator",
      description: "Calculate your initial business expenses and funding needs.",
      type: "Interactive Tool",
      color: "violet",
      featured: true,
      link: "/resources/startup-calculator",
    },
  ]

  const additionalResources = [
    {
      icon: Calendar,
      title: "Tax Calendar 2025",
      description: "Important tax deadlines and filing dates.",
      type: "Calendar",
      color: "orange",
    },
    {
      icon: FileText,
      title: "LLC Operating Agreement Template",
      description: "Professional template for LLC operating agreements.",
      type: "Template",
      color: "cyan",
    },
    {
      icon: BookOpen,
      title: "Entity Comparison Chart",
      description: "Side-by-side comparison of business entity types.",
      type: "Reference",
      color: "green",
    },
  ]

  const upcomingWebinars = [
    {
      title: "Maximizing Deductions: A CPA's Essential Tax Strategies",
      date: "November 15, 2025",
      time: "2:00 PM EST",
      presenter: "Steve Morello, CPA",
      description: "Learn essential tax planning strategies for your new business launch.",
      registrationLink: "#",
    },
    {
      title: "Choosing the Right Business Structure",
      date: "December 22, 2025",
      time: "1:00 PM EST",
      presenter: "NexTax.AI Expert Team",
      description: "Deep dive into LLC vs. Corporation decisions with real-world examples.",
      registrationLink: "#",
    },
    {
      title: "Multi-State Tax Nexus: Navigating Complex State Requirements",
      date: "January 29, 2026",
      time: "3:00 PM EST",
      presenter: "Steve Morello, CPA",
      description: "Navigate complex multi-state tax obligations and nexus requirements.",
      registrationLink: "#",
    },
  ]

  const videoContent = [
    {
      title: "5-Minute Business Formation Basics",
      duration: "5:23",
      thumbnail: "/placeholder.svg?height=200&width=300",
      description: "Quick overview of business entity types and formation process.",
      views: "2.1K",
    },
    {
      title: "Tax Deductions Every Startup Should Know",
      duration: "8:45",
      thumbnail: "/placeholder.svg?height=200&width=300",
      description: "Maximize your tax savings with these essential deduction strategies.",
      views: "3.7K",
    },
    {
      title: "EIN Application Walkthrough",
      duration: "4:12",
      thumbnail: "/placeholder.svg?height=200&width=300",
      description: "Step-by-step guide to obtaining your Employer Identification Number.",
      views: "1.8K",
    },
  ]

  const stats = [
    { value: "50K+", label: "Downloads" },
    { value: "98%", label: "Success Rate" },
    { value: "24/7", label: "AI Support" },
    { value: "Resources", label: "Always Free" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black pt-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-6">
            <BookOpen className="w-4 h-4 mr-2" />
            Business Resources
          </Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Expert Tax Strategy &
            <span className="block text-emerald-400">Business Compliance Resources</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            Expert Content & AI-Powered Insights Designed to Maximize Your Tax Savings
          </p>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-2">{stat.value}</div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Resources */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Featured Resources</h2>
            <p className="text-xl text-slate-300">Our most popular tools and guides</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {featuredResources.map((resource, i) => (
              <Card key={i} className="bg-gray-900/50 border-gray-700 hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        resource.color === "emerald"
                          ? "bg-emerald-500/20"
                          : resource.color === "blue"
                            ? "bg-blue-500/20"
                            : "bg-violet-500/20"
                      }`}
                    >
                      <resource.icon
                        className={`w-6 h-6 ${
                          resource.color === "emerald"
                            ? "text-emerald-400"
                            : resource.color === "blue"
                              ? "text-blue-400"
                              : "text-violet-400"
                        }`}
                      />
                    </div>
                    <Badge
                      className={`${
                        resource.color === "emerald"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : resource.color === "blue"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-violet-500/20 text-violet-300"
                      }`}
                    >
                      {resource.type}
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-xl">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-slate-300">{resource.description}</p>
                   {resource.link ? (
                    <Link href={resource.link}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Download className="w-4 h-4 mr-2" />
                        Calculate for Free
                      </Button>
                    </Link>
                  ) : (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Download Free
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mb-16">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-orange-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">LLC or S-Corp Quiz</h2>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Not sure which business structure is right for you? Take our quick assessment to get personalized
            recommendations based on your specific situation.
          </p>
        </div>
      <SimpleQuiz />
      </div>        
    </div>
    </section>

      {/* Upcoming Webinars */}
      <section className="py-12 bg-black/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Upcoming Expert Webinars</h2>
            <p className="text-xl text-slate-300">Learn from industry experts and get your questions answered live</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {upcomingWebinars.map((webinar, i) => (
              <Card key={i} className="bg-gray-900/50 border-gray-700 hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="w-5 h-5 text-emerald-400" />
                    <Badge className="bg-emerald-500/20 text-emerald-300">Live Webinar</Badge>
                  </div>
                  <CardTitle className="text-white text-lg">{webinar.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      {webinar.date}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      {webinar.time}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4 text-emerald-400" />
                      {webinar.presenter}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">{webinar.description}</p>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Register Free</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Video Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Video Learning Center</h2>
            <p className="text-xl text-slate-300">Quick, actionable videos to help you succeed</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {videoContent.map((video, i) => (
              <Card
                key={i}
                className="bg-gray-900/50 border-gray-700 hover:border-emerald-500/50 transition-colors overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={video.thumbnail || "/placeholder.svg"}
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                    <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-700 transition-colors cursor-pointer">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-sm px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-2">{video.title}</h3>
                  <p className="text-slate-400 text-sm mb-3">{video.description}</p>
                  <div className="flex items-center justify-between text-slate-500 text-sm">
                    <span>{video.views} views</span>
                    <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
                      Watch Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-16 bg-black/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Additional Resources</h2>
            <p className="text-xl text-slate-300">More tools and templates to support your business journey</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {additionalResources.map((resource, i) => (
              <Card key={i} className="bg-gray-900/50 border-gray-700 hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        resource.color === "orange"
                          ? "bg-orange-500/20"
                          : resource.color === "cyan"
                            ? "bg-cyan-500/20"
                            : "bg-green-500/20"
                      }`}
                    >
                      <resource.icon
                        className={`w-5 h-5 ${
                          resource.color === "orange"
                            ? "text-orange-400"
                            : resource.color === "cyan"
                              ? "text-cyan-400"
                              : "text-green-400"
                        }`}
                      />
                    </div>
                    <Badge
                      className={`text-xs ${
                        resource.color === "orange"
                          ? "bg-orange-500/20 text-orange-300"
                          : resource.color === "cyan"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-green-500/20 text-green-300"
                      }`}
                    >
                      {resource.type}
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-lg">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300 text-sm">{resource.description}</p>
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl p-8">
              <h3 className="text-3xl font-bold text-white mb-4">Ready to Launch Your Business?</h3>
              <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
                Get personalized guidance from our AI business advisor and launch your business in 48 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/startsmart">
                  <Button size="lg" className="bg-white text-emerald-600 hover:bg-slate-100 px-8 py-4">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Start Your Business
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 px-8 py-4 bg-transparent"
                  >
                    Get Expert Help
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
