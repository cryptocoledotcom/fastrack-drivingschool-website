import React from 'react';
import { Link } from 'react-router-dom';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import './Home.css';


const testimonials = [
  {
    name: "Johnathen Rickenbach",
    title: "Fast reliable business",
    quote: "Fastrack made learning to drive a breeze! The instructors were patient and the schedule was flexible. I passed my test on the first try!"
  },
  {
    name: "Ashley Smith",
    title: "Expert Instructors",
    quote: "A fantastic experience. The lessons were thorough and I feel much more confident on the road now. Highly recommended!"
  },
  {
    name: "Patricia Mills",
    title: "Great for nervous drivers",
    quote: "I was very nervous about learning to drive, but the instructors at Fastrack were incredibly patient and supportive. I couldn't have done it without them!"
  },
  {
    name: "Mary Williams",
    title: "Top-notch service",
    quote: "From booking my lessons to passing my test, the service was top-notch. The cars are modern and easy to drive. I would recommend Fastrack to anyone."
  },
  {
    name: "David Garcia",
    title: "Highly Recommend!",
    quote: "I had a great experience with Fastrack. The instructors are very knowledgeable and make you feel comfortable behind the wheel. I passed my driving test with flying colors!"
  },
  {
    name: "Sarah Martinez",
    title: "Best Driving School in Town",
    quote: "Fastrack is by far the best. The instructors are professional and the lessons are well-structured. I learned so much in a short amount of time."
  },
  {
    name: "Brian Johnson",
    title: "A+ Service",
    quote: "The customer service is excellent. They were very helpful in scheduling my childs lessons and answering all our questions. I would give them an A+ rating!"
  },
  {
    name: "Linda Brown",
    title: "Finally!",
    quote: "I had been looking into schools to help my son get his license. Thanks to Fastrack, he finally has it! The instructors were amazing and gave him the confidence he needed to succeed."
  }
];

function Home() {
  return (
    <div className="home-container">
      <header className="hero-section">
        <h1>The Driving Course You'll Actually Want to Take</h1>
        <p>A better, cooler online experience for new Ohio drivers</p>
        <Link to="/courses" className="btn btn-primary">View Our Courses</Link>
      </header>
      <section className="page-section">
        <h2>Why Choose Us?</h2>
        <div className="card-container">
          <div className="card">
            <h3>Expert Instructors</h3>
            <p>Learn from the best, most experienced instructors in the industry.</p>
          </div>
          <div className="card">
            <h3>Flexible Scheduling</h3>
            <p>We offer a wide range of class times to fit your busy life.</p>
          </div>
          <div className="card">
            <h3>Modern Fleet</h3>
            <p>Train in new, safe, and comfortable dual-control vehicles.</p>
          </div>
          <div className="card">
            <h3>Competitive Prices</h3>
            <p>We offer competitive prices without compromising on quality.</p>
          </div>
          <div className="card">
            <h3>Fast Services</h3>
            <p>Get your license faster with our efficient and effective teaching methods.</p>
          </div>
        </div>
      </section>

      <section className="page-section video-section">
        <h2>See What We're About!</h2>
          <div className="video-player-wrapper">
            <video controls autoPlay muted loop playsInline>
            {/* --- FOR DEVELOPMENT --- */}
            {/* Use this line to serve the video locally and avoid Firebase bandwidth costs. */}
            <source src="/assets/homepage video.mp4" type="video/mp4" />

            {/* --- FOR PRODUCTION --- */}
            {/* <source src="https://firebasestorage.googleapis.com/v0/b/fastrack-drivingschool-website.firebasestorage.app/o/course_videos%2Fhomepage%20video.mp4?alt=media&token=52e44785-d642-4aa6-bf68-c07e7bbc89d1" type="video/mp4" /> */}
            Sorry, your browser doesn't support embedded videos.
            </video>
        </div>
      </section>


      <section className="page-section info-section">
        <h2>Drivers Under Age 21 (Ages 15½ - 20)</h2>
        <h3>For all new drivers under 21, Ohio mandates a complete "Class D" driver education program. This program has three main components:</h3>
        <div className="card-container">
          <div className="card">
            <h3>24 Hours of Instruction</h3>
            <p>This is the "classroom" portion, which can be completed at a traditional in-person driving school or through a BMV-approved online course. Teens can begin this course at age 15 years and 5 months.</p>
          </div>
          <div className="card">
            <h3>8 Hours of Behind-the-Wheel Training</h3>
            <p>This in-car training must be completed with a state-certified driving instructor from a licensed driving school.</p>
          </div>
          <div className="card">
            <h3>50 Hours of Supervised Driving Practice</h3>
            <p>This is practice time in addition to your 8 hours with an instructor. It must be supervised by a licensed adult who is 21 or older (like a parent or guardian).</p>
          </div>
          <h3>At Fastrack, we can provide the online learning as well as the behind the wheel training so that you and your child can begin the 50 hours of practice knowing that you've learned from the most capable driver's education team out there.</h3><h3> Fastrack Driving School LLC. currently operates and services Columbiana county Ohio only</h3>
        </div>
      </section>

      <section className="page-section">
        <h2>What Our Customers Are Saying:</h2>
        <Carousel
          showArrows={true}
          infiniteLoop={true}
          showThumbs={false}
          showStatus={false}
          autoPlay={true}
          interval={3000}
        >
          {testimonials.map((testimonial, index) => (
            <div key={index} className="card">
              <h3>{testimonial.title}</h3>
              <p>"{testimonial.quote}"</p>
              <p>- {testimonial.name}</p>
            </div>
          ))}
        </Carousel>
      </section>
    </div>
  );
}

export default Home;