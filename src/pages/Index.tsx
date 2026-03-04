import { ArrowUpRight, Mail, Github, Linkedin } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const projects = [
  {
    title: "Brand Identity System",
    category: "Branding",
    description: "Complete visual identity for a sustainable fashion label.",
    year: "2025",
  },
  {
    title: "E-Commerce Platform",
    category: "Web Development",
    description: "Full-stack marketplace with real-time inventory management.",
    year: "2025",
  },
  {
    title: "Mobile Banking App",
    category: "UI/UX Design",
    description: "Reimagined banking experience for Gen Z users.",
    year: "2024",
  },
  {
    title: "Editorial Magazine",
    category: "Print Design",
    description: "Quarterly art & culture publication layout and typography.",
    year: "2024",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 bg-background/80 backdrop-blur-md border-b border-border">
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">
          Portfolio.
        </span>
        <div className="flex gap-6 text-sm font-medium text-muted-foreground">
          <a href="#work" className="hover:text-foreground transition-colors">Work</a>
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
          <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-end">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Abstract architectural composition"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-secondary/60" />
        </div>
        <div className="relative z-10 px-6 md:px-12 pb-16 md:pb-24 max-w-4xl">
          <p className="text-primary font-medium text-sm tracking-widest uppercase mb-4 animate-fade-up">
            Creative Developer & Designer
          </p>
          <h1 className="text-4xl md:text-7xl font-bold font-heading text-primary-foreground leading-[1.05] mb-6 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
            Crafting digital
            <br />
            experiences that
            <br />
            <span className="text-primary">matter.</span>
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-md animate-fade-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
            I design and build thoughtful products at the intersection of form and function.
          </p>
        </div>
      </section>

      {/* Projects */}
      <section id="work" className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">
            Selected Work
          </p>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground mb-16">
            Recent Projects
          </h2>

          <div className="space-y-0 border-t border-border">
            {projects.map((project, i) => (
              <a
                key={i}
                href="#"
                className="group flex flex-col md:flex-row md:items-center justify-between py-8 border-b border-border hover:bg-muted/50 transition-colors px-2 -mx-2 rounded-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl md:text-2xl font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-muted-foreground text-sm max-w-md">
                    {project.description}
                  </p>
                </div>
                <div className="flex gap-6 mt-3 md:mt-0 text-sm text-muted-foreground">
                  <span className="bg-muted px-3 py-1 rounded-full">{project.category}</span>
                  <span>{project.year}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-6 md:px-12 py-24 md:py-32 bg-secondary">
        <div className="max-w-4xl mx-auto">
          <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">
            About
          </p>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-secondary-foreground mb-8">
            A little about me
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-secondary-foreground/80 text-lg leading-relaxed">
            <p>
              I'm a creative developer who thrives at the intersection of design and engineering. With a keen eye for detail and a passion for clean code, I build digital products that are both beautiful and functional.
            </p>
            <p>
              When I'm not coding, you'll find me exploring architecture, experimenting with analog photography, or diving deep into typography. I believe great design is invisible — it just works.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">
            Get in Touch
          </p>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground mb-6">
            Let's work together
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto">
            Have a project in mind? I'd love to hear about it. Drop me a line and let's create something great.
          </p>
          <a
            href="mailto:hello@example.com"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium text-lg hover:opacity-90 transition-opacity"
          >
            <Mail className="w-5 h-5" />
            Say Hello
          </a>

          <div className="flex justify-center gap-6 mt-12">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-border text-center text-sm text-muted-foreground">
        © 2026 Portfolio. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
