import { GlowCard } from "@/components/ui/spotlight-card";
import { Calendar, MapPin, Clock, Users } from "lucide-react";

export function SpotlightDemo() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center gap-10 p-8">
      {/* Main Demo Section */}
      <div className="flex flex-wrap items-center justify-center gap-8">
        {/* Event Card 1 */}
        <GlowCard glowColor="blue" size="md">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <img
                src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=300&h=200&fit=crop"
                alt="Music Festival"
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-bold text-white mb-2">Summer Music Festival</h3>
              <p className="text-gray-300 text-sm mb-4">
                Experience the biggest music festival of the year with top artists from around the world.
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>July 15-17, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Central Park, NYC</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>50,000+ attendees</span>
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Event Card 2 */}
        <GlowCard glowColor="purple" size="md">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <img
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop"
                alt="Tech Conference"
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-bold text-white mb-2">Tech Innovation Summit</h3>
              <p className="text-gray-300 text-sm mb-4">
                Join industry leaders and innovators in exploring the future of technology.
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>August 5-6, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Silicon Valley, CA</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>9:00 AM - 6:00 PM</span>
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Event Card 3 */}
        <GlowCard glowColor="green" size="md">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <img
                src="https://images.unsplash.com/photo-1414016642750-7fdd78dc33d9?w=300&h=200&fit=crop"
                alt="Art Exhibition"
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-bold text-white mb-2">Modern Art Exhibition</h3>
              <p className="text-gray-300 text-sm mb-4">
                Discover contemporary masterpieces from renowned artists worldwide.
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>September 1-30, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>MoMA, New York</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Limited capacity</span>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Additional Size Demonstrations */}
      <div className="flex flex-wrap items-center justify-center gap-6">
        <GlowCard glowColor="red" size="sm">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-2">Small Card</h4>
            <p className="text-gray-300 text-sm">Compact design</p>
          </div>
        </GlowCard>

        <GlowCard glowColor="orange" size="lg">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <img
                src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=250&fit=crop"
                alt="Food Festival"
                className="w-full h-40 object-cover rounded-lg mb-4"
              />
              <h3 className="text-2xl font-bold text-white mb-3">Food & Wine Festival</h3>
              <p className="text-gray-300 mb-4">
                Indulge in culinary delights from world-class chefs and discover exceptional wines.
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>October 12-14, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Napa Valley, CA</span>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Custom Size Example */}
      <GlowCard
        glowColor="purple"
        customSize={true}
        className="w-full max-w-4xl h-64"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Custom Sized Card</h2>
            <p className="text-gray-300 text-lg">This card uses custom dimensions and spans the full width</p>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}

export function Default() {
  return <SpotlightDemo />;
}
