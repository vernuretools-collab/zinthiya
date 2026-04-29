import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Shield, Heart, Phone, Calendar } from 'lucide-react';
import zinthiya from "../../assets/zinthiya.jpg";
import heroBg from "../../assets/home.jpg"; // Add your hero background image here
import abuseBg from "../../assets/abuseBg.jpg";
import moneyBg from "../../assets/moneyBg.jpg";
import povertyBg from "../../assets/povertyBg.jpg";
import footer from "../../assets/footer.png";


export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header - Logo Centered and Bigger */}
      <header className="bg-white backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
          <div className="flex items-center justify-center">
            <div className="h-16  sm:h-20 sm:w-32 md:h-24 md:w-40 lg:h-20 lg:w-66">
              <img
                src={zinthiya}
                alt="Zinthiya Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Width Background Image */}
      <section
        className="relative py-20 sm:py-24 md:py-32 lg:py-40 overflow-hidden "
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',

        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40 lg:bg-black/50" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#D80175] xl:text-3xl font-bold mb-6 sm:mb-8 md:mb-10 leading-tight px-4 sm:px-8 drop-shadow-lg" >Welcome to The Zinthiya Trust</h3>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-6xl font-bold mb-6 sm:mb-8 md:mb-10 leading-tight px-4 sm:px-8 drop-shadow-lg">
              Get Free Confidential Support When You Need It
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-8 sm:mb-10 md:mb-12 px-4 sm:px-8 max-w-3xl mx-auto drop-shadow-md leading-relaxed">
              Professional guidance for domestic abuse, debt advice, welfare support, and counselling
            </p>

            {/* Get Support Button */}
            <div className="flex justify-center px-4">
              <Button
                size="lg"
                className="text-white text-lg md:text-xl 
                          px-8 py-4 md:px-12 md:py-5 lg:px-16 lg:py-6
                          rounded-xl md:rounded-2xl
                          shadow-2xl hover:shadow-3xl backdrop-blur-sm
                          transition-all duration-700
                          
                          border-2 border-white/30 bg-[#D80175]
                          font-bold
                          w-48 sm:w-auto
                          max-w-sm
                          cursor-pointer
                          flex items-center justify-center
                          hover:scale-105"
                onClick={() => navigate('/booking/support-type')}
              >
                <Calendar className="mr-3 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 flex-shrink-0" />
                <span>Get Support</span>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 md:mt-20 px-10 sm:px-8">
              <div className="flex flex-row items-center justify-center sm:justify-center  gap-3 border border-white/30 backdrop-blur-sm rounded-xl p-4 sm:p-5 bg-white/10 shadow-xl hover:shadow-2xl transition-all hover:scale-105 text-left">
                <Shield className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-[#D80175] flex-shrink-0" />
                <span className="text-sm sm:text-base md:text-lg font-semibold text-white drop-shadow-md">
                  100% Confidential
                </span>
              </div>

              <div className="flex flex-row items-center justify-center  sm:justify-center gap-3 border border-white/30 backdrop-blur-sm rounded-xl p-4 sm:p-5 bg-white/10 shadow-xl hover:shadow-2xl transition-all hover:scale-105 text-left">
                <Heart className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8  text-[#D80175] flex-shrink-0" />
                <span className="text-sm sm:text-base md:text-lg font-semibold text-white drop-shadow-md">
                  Free Service
                </span>
              </div>

              <div className="flex flex-row items-center justify-center sm:justify-center gap-3 border border-white/30 backdrop-blur-sm rounded-xl p-4 sm:p-5 bg-white/10 shadow-xl hover:shadow-2xl transition-all hover:scale-105 text-left">
                <Phone className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-[#D80175] flex-shrink-0" />
                <span className="text-sm sm:text-base md:text-lg font-semibold text-white drop-shadow-md">
                  Trained Advisers
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="container mx-auto px-4 py-10 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-10 md:mb-12 text-gray-900 px-2">
            How We Can Help
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {/* Card 1 */}
            <div
              className="relative text-white rounded-none shadow-lg overflow-hidden aspect-[1/1] flex items-center "
              style={{
                backgroundImage: `url(${abuseBg})`,
                backgroundSize: 'cover',


              }}
            >
              <div className="absolute inset-0 bg-pink-600/80 mix-blend-multiply" />
              <div className="relative p-6 sm:p-3 flex flex-col justify-center ">

                <p className="text-xl sm:text-3xl md:text-3xl font-extrabold leading-tight ">
                  DOMESTIC ABUSE SUPPORT
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div
              className="relative text-white rounded-none shadow-lg overflow-hidden aspect-[1/1] flex items-center justify-center"
              style={{ backgroundImage: `url(${moneyBg})` }}
            >
              <div className="absolute inset-0 bg-pink-600/80 mix-blend-multiply" />
              <div className="relative p-20 sm:p-0 flex flex-col ">
                <p className="text-xl sm:text-3xl md:text-3xl font-extrabold leading-tight space-y-1 text-center">

                  Money Advice & Welfare
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div
              className="relative text-white rounded-none shadow-lg overflow-hidden aspect-[1/1] flex items-center"
              style={{ backgroundImage: `url(${povertyBg})` }}
            >
              <div className="absolute inset-0 bg-pink-600/80 mix-blend-multiply" />
              <div className="relative p-6 sm:pl-10 flex flex-col justify-center">
                <p className="text-xl sm:text-3xl md:text-3xl font-extrabold leading-tight mb-4">

                  Emergency Energy & Food Support
                </p>

              </div>
            </div>

            {/* Card 4 */}
            <div
              className="relative text-white rounded-none shadow-lg overflow-hidden aspect-[1/1] flex items-center"
              style={{ backgroundImage: `url(${moneyBg})` }}
            >
              <div className="absolute inset-0 bg-pink-600/80 mix-blend-multiply" />
              <div className="relative p-3 sm:p-8 flex flex-col ">
                <p className="text-xl sm:text-3xl md:text-3xl font-extrabold leading-tight space-y-1   ">

                  Debt Advice
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      {/* About Section - Full Width Background */}
      <section
        className="relative py-16 sm:py-20 md:py-24 overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Soft overlay for readability */}
        <div className="absolute inset-0  backdrop-blur-sm" />

        <div className="relative container mx-auto px-4 ">
          <Card className="shadow-2xl  backdrop-blur-sm border-0">
            <CardHeader className="pb-6 sm:pb-8">
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#D80175]">
                About Us
              </CardTitle>
              <CardDescription className="text-lg sm:text-xl text-white mt-2">
                Supporting Leicester Communities Since 2020
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-white text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl">
                Zinthiya Ganeshpanchan Trust is a Leicester-based charity dedicated to
                supporting individuals and families affected by domestic abuse,
                financial hardship, and other life challenges. Our trained Advisers
                provide compassionate, confidential support tailored to your needs.
              </p>
              <div className="p-6 sm:p-8 bg-white/70 rounded-2xl border border-blue-200 shadow-sm">
                <div className="space-y-4 text-sm sm:text-base md:text-lg text-gray-900">
                  <p className="flex flex-col sm:flex-row sm:gap-4 items-start sm:items-center">
                    <strong className="inline-block min-w-fit text-blue-900 mb-1 sm:mb-0">
                      📍 Visit us:
                    </strong>
                    <span>12 Bishop Street, Leicester LE1 6AF</span>
                  </p>
                  <p className="flex flex-col sm:flex-row sm:gap-4 items-start sm:items-center">
                    <strong className="inline-block min-w-fit text-blue-900 mb-1 sm:mb-0">
                      📞 Call us:
                    </strong>
                    <a
                      href="tel:01162545168"
                      className="underline hover:text-blue-700 font-semibold"
                    >
                      0116 254 5168
                    </a>
                  </p>
                  <p className="flex flex-col sm:flex-row sm:gap-4 items-start sm:items-center">
                    <strong className="inline-block min-w-fit text-blue-900 mb-1 sm:mb-0">
                      ✉️ Email:
                    </strong>
                    <a
                      href="mailto:info@zinthiyatrust.org"
                      className="underline hover:text-blue-700 font-semibold break-all"
                    >
                      info@zinthiyatrust.org
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>



      {/* Footer */}
      <footer className="bg-[#e0007a] text-white py-10 sm:py-12 md:py-14 mt-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-4">
            {/* Logo */}
            <div className="h-12 sm:h-14  md:h-16">
              <img
                src={footer}
                alt="Zinthiya Ganeshpanchan Trust"
                className="h-full w-auto object-contain"
              />
            </div>

            {/* Text block */}
            <div className="space-y-2 text-xs sm:text-sm md:text-base leading-relaxed">
              <p>12 Bishop Street, Leicester, LE1 6AF</p>
              <p>The Zinthiya Trust is a registered charity.</p>
              <p className="font-semibold mt-1">Charity No: 1137350</p>

              <div className="mt-3 space-y-1">
                <p className="font-semibold">Office Opening Times:</p>
                <p>Monday – Friday: 9.30am – 4pm</p>
              </div>

              {/* <div className="mt-3 space-y-1">
                <p>
                  The Zinthiya Trust is authorised and regulated by the Financial
                  Conduct Authority.
                </p>
                <p>FCA registered and accredited</p>
                <p>
                  Reference number: 626897{" "}
                  <span className="mx-1">|</span>
            <a
              href="/privacy"
              className="underline font-medium hover:text-gray-100"
            >
              Privacy
            </a>
                </p>
              </div> */}
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
}
