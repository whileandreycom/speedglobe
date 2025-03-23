// Global variables
let city = {
  name: "Pick a city",
  coordinates: [-30, 0],
};
const width = window.innerWidth,
  height = window.innerHeight;
const globeScale = Math.min(width, height) / 3.5;

// Animation stuff & flags
let previousLatitude = 0;
let previousCoordinates = [-30, 0];
let prevPitch = -previousCoordinates[1] / 2;
let changingCity = false;
let showCity = false;

// SVG handle globals
const center = { x: width / 2, y: height / 2 };
const innerRadius = globeScale*1.005; // Offset distance from center
const outerRadius = globeScale/3; // Length from innerRadius to the circle
let dragLatitude = 0;



// City search input

document.getElementById("cityInput").addEventListener("input", async function () {
  const query = this.value.trim();
  const suggestions = document.getElementById("suggestions");

  if (query.length < 2) {
    suggestions.innerHTML = "";
    suggestions.style.display = "none"; // Hide if input is empty
    return;
  }

  try {
    const response = await fetch(
      `https://secure.geonames.org/searchJSON?name_startsWith=${query}&featureClass=P&maxRows=10&username=whileandrey`
    );
    const data = await response.json();

    if (Array.isArray(data.geonames) && data.geonames.length > 0) {
      suggestions.innerHTML = "";
      suggestions.style.display = "block"; // Show list when results exist

      data.geonames.forEach((cityData) => {
        const li = document.createElement("li");
        li.textContent = `${cityData.name}, ${cityData.countryName}`;
        li.classList.add("list-group-item", "list-group-item-action");

        li.onclick = () => {
          previousLatitude = city.coordinates[1];
          changingCity = true;
          showCity = true;

          city = {
            name: cityData.name,
            coordinates: [parseFloat(cityData.lng), parseFloat(cityData.lat)],
          };
          console.log("Latitude:", city.coordinates[1]);
          document.getElementById("cityInput").value = city.name;
          suggestions.innerHTML = "";
          suggestions.style.display = "none"; // Hide after selection
          console.log(speedAtLatitude(city.coordinates[1]) + " mph");
        };

        suggestions.appendChild(li);
      });
    } else {
      suggestions.innerHTML = "";
      suggestions.style.display = "none"; // Hide if no results
    }
  } catch (error) {
    console.error("Error fetching city data:", error);
  }
});

// Hide suggestions when clicking outside
document.addEventListener("click", (event) => {
  if (!document.getElementById("cityInput").contains(event.target)) {
    document.getElementById("suggestions").style.display = "none";
  }
});

// GLOBE
// Set canvas dimensions

const canvas = document.getElementById("mapCanvas");
canvas.width = width;
canvas.height = height;
const context = canvas.getContext("2d");


// Graticule
const graticule = d3.geoGraticule10();

// Outline
const outline = { type: "Sphere" };

// Create an orthographic projection
const projection = d3
  .geoOrthographic()
  .scale(globeScale)
  .translate([width / 2, height / 2])
  .clipAngle(90); // Clip the far side of the globe

// let [xPrev, yPrev] = projection(previousCoordinates);

// Path generator using canvas context
const path = d3.geoPath(projection, context);

// Rotation settings
let λ = 0; // Longitude rotation
let φ = 0; // Latitude rotation
const rotationSpeed = 0.2; // Degrees per frame

// Load world map data
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json").then(
  (data) => {
    const land = topojson.feature(data, data.objects.land);
    animate();

    let isDragging = false;
    let prevX = 0;
    
    // Start dragging on mousedown anywhere on the page
    document.addEventListener("mousedown", (event) => {
      if (event.target.tagName === "INPUT" || event.target.classList.contains("draggable-svg")) {
        return; // Ignore drag if clicking input or SVG controls
      }
      isDragging = true;
      prevX = event.clientX;
    });
    
    // Capture movement even when mouse is over other elements
    document.addEventListener("mousemove", (event) => {
      if (isDragging) {
        const dx = event.clientX - prevX;
        λ += dx * 0.2; // Adjust sensitivity
        projection.rotate([λ, φ]); // Apply rotation
        prevX = event.clientX;
      }
    });
    
    // Stop dragging when mouse is released
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
    
    function animate() {
      // Update rotation (rotate eastward)

      // Animate rotation
      if (changingCity) {
        
        let targetPitch = -city.coordinates[1] / 2
        let newPitch = prevPitch + (targetPitch - prevPitch) / 20;
        φ = newPitch;
        λ += rotationSpeed;
        projection.rotate([λ, φ]);
        
        // console.log("prevPich", prevPitch, "newPitch", newPitch, "φ", φ);
        prevPitch = newPitch;

        // Base case to stop aniimation
        if (Math.round(newPitch * 10) / 10 == Math.round(targetPitch * 10) / 10) {
          changingCity = false;
          console.log("changingCity", changingCity);
      }
    } else {
      φ = -city.coordinates[1] / 2;
      λ += rotationSpeed;
      projection.rotate([λ, φ]);
    }
      // Clear canvas
      context.clearRect(0, 0, width, height);

      // Draw background
      context.fillStyle = "#000"; // background
      context.fillRect(0, 0, width, height);

      // Draw sphere - slows animation like crazy
      // context.beginPath(), path(outline), context.clip(), context.fillStyle = "#ADD8E6", context.fillRect(0, 0, width, height);

      // Draw graticule
      // context.beginPath(),
      //   path(graticule),
      //   (context.strokeStyle = "#333"),
      //   context.lineWidth = 1;
      //   context.stroke();

      // Draw land
      context.beginPath();
      path(land);
      context.fillStyle = "#fff";
      context.fill();

      // Draw latitude line
      if (previousLatitude !== city.coordinates[1]) {
        // Animates to new latitude
        let latitude =
          (city.coordinates[1] - previousLatitude) / 20 + previousLatitude;
        drawLatitudeLine(latitude);
        previousLatitude = latitude;
        // console.log("animated to lat:", latitude)

        // Update line, circle, and text positions
        if (showCity == true) {
          updateHandleFromLatitude(latitude);
        }

        // Base case to stop animation
        if (
          Math.round(latitude * 100) / 100 ==
          Math.round(city.coordinates[1] * 100) / 100
        ) {
          previousLatitude = city.coordinates[1];
          // console.log("latitude achieved", city.coordinates[1]);
        }
      } else {
        drawLatitudeLine(city.coordinates[1]);
        // console.log("latitude achieved", city.coordinates[1]);
      }

      // Draw globe outline on top of everything but the city label
      context.beginPath(),
        path(outline),
        (context.strokeStyle = "#fff"),
        context.lineWidth = globeScale / 100;
        context.stroke();

      // Draw land outline
      // context.beginPath();
      // path(land);
      // context.strokeStyle = "#000";
      // context.lineWidth = 1;
      // context.stroke();

      // Check if Los Angeles is visible (in front of the globe)

      // If animating
      // if (changingCity) {
      //   // if animating
      //   console.log("animating");
      //   // Animate to new city
      //   if (isCityVisible(city.coordinates)) {
      //     const [x, y] = projection(city.coordinates);

      //     let xNew = xPrev + (x - xPrev) / 20;
      //     let yNew = yPrev + (y - yPrev) / 20;

      //     context.beginPath();
      //     context.arc(xNew, yNew, 5, 0, 2 * Math.PI);
      //     context.fillStyle = "#FF2C2C";
      //     context.fill();

      //     context.beginPath();
      //     context.arc(xNew, yNew, 10, 0, 2 * Math.PI);
      //     context.strokeStyle = "#FF2C2C";
      //     context.stroke();

      //     context.fillStyle = "#FF2C2C";
      //     context.font = "14px Arial";
      //     context.fillText(city.name, xNew + 16, yNew - 16);

      //     [xPrev, yPrev] = [xNew, yNew];
      //     // console.log("xPrev", xPrev, "yPrev", yPrev);
      //     // console.log("x", x, "y", y);

      //     if (
      //       // x >= xNew-10 &&
      //       // x <= xNew+10 &&
      //       y >= yNew-1 &&
      //       y <= yNew+1
      //     ) {
      //       previousCoordinates = city.coordinates;
      //       changingCity = false;
      //     }
      //   }
      // } else {
        // if not animating
        if (isCityVisible(city.coordinates) && showCity == true) {
          const [x, y] = projection(city.coordinates);

          // Draw city marker
          context.beginPath();
          context.arc(x, y, globeScale / 35, 0, 2 * Math.PI);
          context.fillStyle = "#FF2C2C";
          context.fill();

          context.beginPath();
          context.arc(x, y, globeScale / 15, 0, 2 * Math.PI);
          context.strokeStyle = "#FF2C2C";
          context.lineWidth = globeScale / 70;
          context.stroke();

          // City Marker Label
          // context.fillStyle = "#FF2C2C";
          // context.font = "14px Arial";
          // context.fillText(city.name, x + 16, y - 16);
        // }
      }

      // context.strokeStyle = "black";
      // context.lineWidth = 1;
      // context.stroke();

      // Draw speed label
      // context.fillStyle = "#FF2C2C";
      // context.font = "14px Arial";
      // context.fillText(speedAtLatitude(latitude) + " mph", x + 16, y - 16);
      // context.fillText(city.name, x + 16, y - 16);

      requestAnimationFrame(animate);
    }

    // Request next frame
  }
);

function drawLatitudeLine(lat) {
  let firstVisible = true;
  let lastVisible = false;

  context.beginPath();

  for (let lon = -180; lon <= 180; lon += 5) {
    // Create points every 5 degrees
    const visible = isPointVisible([lon, lat]);
    const projected = projection([lon, lat]);

    if (projected && visible) {
      if (!lastVisible) {
        context.moveTo(projected[0], projected[1]); // Start new segment
      } else {
        context.lineTo(projected[0], projected[1]); // Continue line
      }
      lastVisible = true;
    } else {
      lastVisible = false; // Stop drawing when moving behind the globe
    }
  }

  context.strokeStyle = "#FF2C2C";
  context.lineWidth = globeScale / 70;
  context.stroke();
}

function isPointVisible([lon, lat]) {
  const [cx, cy, cz] = lonLatToCartesian(lon, lat);
  const [px, py, pz] = lonLatToCartesian(-λ, -φ); // Forward-facing direction
  return cx * px + cy * py + cz * pz > 0; // Dot product > 0 → visible
}

// Function to determine if a city is visible (on the front side of the globe)
function isCityVisible([lon, lat]) {
  const [cx, cy, cz] = lonLatToCartesian(lon, lat);
  const [px, py, pz] = lonLatToCartesian(-λ, -φ); // Forward-facing direction
  return cx * px + cy * py + cz * pz > 0; // Dot product > 0 → visible
}

// Converts longitude/latitude to 3D Cartesian coordinates
function lonLatToCartesian(lon, lat) {
  const λ = (lon * Math.PI) / 180; // Convert degrees to radians
  const φ = (lat * Math.PI) / 180;
  return [
    Math.cos(φ) * Math.cos(λ), // X
    Math.cos(φ) * Math.sin(λ), // Y
    Math.sin(φ), // Z
  ];
}

function findEdgeIntersection(p1, p2) {
  if (!p1 || !p2) return null;
  const r = width / 2; // Radius of the globe
  const [x1, y1] = p1;
  const [x2, y2] = p2;

  // Solve for the intersection of the line segment and the circular boundary
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dr2 = dx * dx + dy * dy;
  const D = x1 * y2 - x2 * y1;
  const discriminant = r * r * dr2 - D * D;

  if (discriminant < 0) return null; // No intersection

  // Find intersection point
  const sqrtDisc = Math.sqrt(discriminant);
  const sign = dy < 0 ? -1 : 1;
  const ix1 = (D * dy + sign * dx * sqrtDisc) / dr2;
  const iy1 = (-D * dx + Math.abs(dy) * sqrtDisc) / dr2;

  return [ix1, iy1];
}

function speedAtLatitude(lat) {
  // if (lat == 90) return 0;
  const omega = 7.2921159e-5; // Earth's precise angular velocity in rad/s
  const R = 6378137; // Earth's equatorial radius in meters (WGS84 standard)
  const metersPerSecond = omega * R * Math.cos(lat * (Math.PI / 180)); // Speed in m/s
  const milesPerHour = metersPerSecond * 2.23694; // Convert m/s to mph
  return Math.round(milesPerHour * 100) / 100; // Round to 2 decimal places
}


// --------------------------------- //
//SVG HANDLE

// Create SVG container
const svg = d3.select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Initial angle and positions
let angle = 0; // Start at 0 degrees
let start = {
  x: center.x + innerRadius * Math.cos(angle),
  y: center.y + innerRadius * Math.sin(angle)
};
let end = {
  x: center.x + (innerRadius + outerRadius) * Math.cos(angle),
  y: center.y + (innerRadius + outerRadius) * Math.sin(angle)
};

// Append line
const line = svg.append("line")
  .attr("x1", start.x)
  .attr("y1", start.y)
  .attr("x2", end.x)
  .attr("y2", end.y)
  .attr("stroke", "#FF2C2C")
  .attr("stroke-width", `${globeScale/70}`);

// Append circle
const circle = svg.append("circle")
  .attr("cx", end.x)
  .attr("cy", end.y)
  .attr("r", `${globeScale/6}`)
  .attr("fill", "#FF2C2C")
  .call(d3.drag().on("drag", dragged));

// Append text inside the circle
const circleText = svg.append("text")
  .attr("x", end.x)
  .attr("y", end.y-globeScale/40)
  .attr("dy", "0.35em") // Center vertically
  .attr("text-anchor", "middle") // Center horizontally
  .attr("fill", "white")
  .attr("font-size", `${globeScale/8}px`)
  .attr("pointer-events", "none")
  .text(Math.round(speedAtLatitude(dragLatitude)));

  const circleTextMPH = svg.append("text")
  .attr("x", end.x)
  .attr("y", end.y+globeScale/13)
  //.attr("dy", "0.35em") // Center vertically
  .attr("text-anchor", "middle") // Center horizontally
  .attr("fill", "white")
  .attr("font-size", `${globeScale/15}px`)
  .attr("pointer-events", "none")
  .text("mph");

  function dragged(event) {
    showCity = false;
    document.getElementById("cityInput").value = '';

    // Compute new angle
    let dx = event.x - center.x;
    let dy = event.y - center.y;
    let newAngle = Math.atan2(dy, dx);
  
    // Clamp the angle between -π/2 and π/2 (right side only)
    angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, newAngle));
  
    // Compute new start and end points with offset
    start.x = center.x + innerRadius * Math.cos(angle);
    start.y = center.y + innerRadius * Math.sin(angle);
    end.x = center.x + (innerRadius + outerRadius) * Math.cos(angle);
    end.y = center.y + (innerRadius + outerRadius) * Math.sin(angle);
  
    // Compute latitude (90 at the top, -90 at the bottom)
    dragLatitude = -angle * (180 / Math.PI); // Convert from radians to degrees and invert
    city.coordinates[1] = dragLatitude;
    prevPitch = -dragLatitude/2;
  
    // Update line, circle, and text positions
    line.attr("x1", start.x).attr("y1", start.y)
        .attr("x2", end.x).attr("y2", end.y);
    circle.attr("cx", end.x).attr("cy", end.y);
    circleText.attr("x", end.x).attr("y", end.y-globeScale/40)
              .text(Math.round(speedAtLatitude(dragLatitude)));
    circleTextMPH.attr("x", end.x).attr("y", end.y+globeScale/13)
              .text('mph'); // Display speed inside the circle
    
  
    // console.log("dragLatitude:", dragLatitude); // Use dragLatitude elsewhere
  }

  function computeLinePositions(latitude) {
    // Convert latitude (90 to -90) to angle (-π/2 to π/2)
    let angle = -latitude * (Math.PI / 180); // Convert degrees to radians
  
    return {
      start: {
        x: center.x + innerRadius * Math.cos(angle),
        y: center.y + innerRadius * Math.sin(angle)
      },
      end: {
        x: center.x + (innerRadius + outerRadius) * Math.cos(angle),
        y: center.y + (innerRadius + outerRadius) * Math.sin(angle)
      }
    };
  }
  
  function updateHandleFromLatitude(lat) {
    let positions = computeLinePositions(lat);
    
    // Update elements
    line.attr("x1", positions.start.x).attr("y1", positions.start.y)
        .attr("x2", positions.end.x).attr("y2", positions.end.y);
    circle.attr("cx", positions.end.x).attr("cy", positions.end.y);
    circleText.attr("x", positions.end.x).attr("y", positions.end.y-globeScale/40)
              .text(Math.round(speedAtLatitude(lat)));
    circleTextMPH.attr("x", positions.end.x).attr("y", positions.end.y+globeScale/13)
              .text('mph');
  }
