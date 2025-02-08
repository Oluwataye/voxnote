
const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl space-y-8 animate-in">
        <div className="text-center space-y-4">
          <span className="inline-block px-3 py-1 text-sm font-medium bg-secondary text-secondary-foreground rounded-full">
            Welcome
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">
            Start Building Something Amazing
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            This minimalist React application is your canvas. Create something extraordinary with clean design and smooth interactions.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <button className="px-6 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90">
            Get Started
          </button>
          <button className="px-6 py-3 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg transition-colors hover:bg-secondary/80">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
