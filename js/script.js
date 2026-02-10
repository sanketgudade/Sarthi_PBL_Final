function go(id){
  document.getElementById(id).scrollIntoView({behavior:"smooth"});
  // Close menu after clicking on mobile
  document.getElementById('navLinks').classList.remove('active');
}

// Function to open/close mobile menu
function toggleMenu() {
  const nav = document.getElementById('navLinks');
  nav.classList.toggle('active');
}

const observer = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add("show");
    }
  });
},{threshold:0.1}); // Changed threshold to 0.1 so images load faster

document.querySelectorAll(".fade")
.forEach(el=>observer.observe(el));