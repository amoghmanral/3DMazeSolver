import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const MazeSolver3D = () => {
  // State for maze dimensions and configuration
  const [dimensions, setDimensions] = useState({ x: 10, y: 10, z: 5 });
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0, z: 0 });
  const [endPoint, setEndPoint] = useState({ x: 9, y: 9, z: 4 });
  const [maze, setMaze] = useState([]);
  const [solution, setSolution] = useState([]);
  const [showOnlySolution, setShowOnlySolution] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [hasSolution, setHasSolution] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [maxDimension, setMaxDimension] = useState(50);

  // Refs for Three.js components
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const mazeObjectsRef = useRef([]);
  const solutionObjectsRef = useRef([]);

  // Initialize Three.js scene
  useEffect(() => {
    if (mountRef.current) {
      // Clear any existing canvases
      while (mountRef.current.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }
    }
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(dimensions.x * 1.5, dimensions.y * 1.5, dimensions.z * 2);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Shadows disabled for performance
    renderer.shadowMap.enabled = false;
    
    // Make sure the canvas is styled appropriately
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.zIndex = '0';
    
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.target.set(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2);
    controlsRef.current = controls;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Add directional light (no shadows)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(dimensions.x * 2, dimensions.y * 2, dimensions.z * 2);
    scene.add(directionalLight);
    
    // Add a point light to enhance visibility
    const pointLight = new THREE.PointLight(0xffffff, 0.8, dimensions.x * 3);
    pointLight.position.set(dimensions.x / 2, dimensions.y / 2, dimensions.z * 2);
    scene.add(pointLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(Math.max(dimensions.x, dimensions.y, dimensions.z) * 2, 20);
    gridHelper.position.set(dimensions.x / 2, 0, dimensions.z / 2);
    gridHelper.visible = showGrid;
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Make a dummy call to generateRandomMaze after a short delay
    // This ensures the scene is visible with some content
    setTimeout(() => {
      if (maze.length === 0 && !isGenerating) {
        generateRandomMaze();
      }
    }, 500);

    // Clean up on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  // Generate random maze
  const generateRandomMaze = () => {
    setIsGenerating(true);
    
    // Clear previous maze and solution
    clearMazeAndSolution();
    
    // Create empty maze
    const newMaze = Array(dimensions.x).fill().map(() =>
      Array(dimensions.y).fill().map(() =>
        Array(dimensions.z).fill(false)
      )
    );
    
    // Generate maze walls using a maze generation algorithm (simplified here)
    // We'll use a simplified approach that creates walls with some connectivity
    
    // First, create some random walls (30% of cells are walls)
    for (let x = 0; x < dimensions.x; x++) {
      for (let y = 0; y < dimensions.y; y++) {
        for (let z = 0; z < dimensions.z; z++) {
          // Add walls with higher probability near the center to create maze-like structures
          const distFromCenter = Math.sqrt(
            Math.pow((x - dimensions.x / 2) / dimensions.x, 2) +
            Math.pow((y - dimensions.y / 2) / dimensions.y, 2) +
            Math.pow((z - dimensions.z / 2) / dimensions.z, 2)
          );
          
          // Probability decreases with distance from center, creating more structure
          const wallProbability = 0.3 * (1 - distFromCenter) + 0.1;
          
          if (Math.random() < wallProbability) {
            newMaze[x][y][z] = true;
          }
        }
      }
    }
    
    // Add some connecting walls to make it more maze-like
    for (let i = 0; i < dimensions.x * dimensions.y * dimensions.z * 0.05; i++) {
      const x = Math.floor(Math.random() * (dimensions.x - 2)) + 1;
      const y = Math.floor(Math.random() * (dimensions.y - 2)) + 1;
      const z = Math.floor(Math.random() * (dimensions.z - 2)) + 1;
      
      // Create small wall segments in random directions
      const direction = Math.floor(Math.random() * 6);
      switch (direction) {
        case 0: // +x direction
          newMaze[x][y][z] = true;
          newMaze[x+1][y][z] = true;
          break;
        case 1: // -x direction
          newMaze[x][y][z] = true;
          newMaze[x-1][y][z] = true;
          break;
        case 2: // +y direction
          newMaze[x][y][z] = true;
          newMaze[x][y+1][z] = true;
          break;
        case 3: // -y direction
          newMaze[x][y][z] = true;
          newMaze[x][y-1][z] = true;
          break;
        case 4: // +z direction
          newMaze[x][y][z] = true;
          newMaze[x][y][z+1] = true;
          break;
        case 5: // -z direction
          newMaze[x][y][z] = true;
          newMaze[x][y][z-1] = true;
          break;
      }
    }
    
    // Ensure start and end points are not walls
    const newStart = {
      x: Math.floor(Math.random() * dimensions.x),
      y: Math.floor(Math.random() * dimensions.y),
      z: Math.floor(Math.random() * dimensions.z)
    };
    
    let newEnd;
    do {
      newEnd = {
        x: Math.floor(Math.random() * dimensions.x),
        y: Math.floor(Math.random() * dimensions.y),
        z: Math.floor(Math.random() * dimensions.z)
      };
      // Ensure end is at least some distance from start
    } while (
      Math.abs(newEnd.x - newStart.x) + 
      Math.abs(newEnd.y - newStart.y) + 
      Math.abs(newEnd.z - newStart.z) < 
      Math.max(dimensions.x, dimensions.y, dimensions.z) / 2
    );
    
    newMaze[newStart.x][newStart.y][newStart.z] = false;
    newMaze[newEnd.x][newEnd.y][newEnd.z] = false;
    
    setStartPoint(newStart);
    setEndPoint(newEnd);
    setMaze(newMaze);
    
    // Render the maze
    renderMaze(newMaze, newStart, newEnd);
    
    // Ensure there is a solution
    const path = solveMazeBFS(newMaze, newStart, newEnd);
    if (!path) {
      // If no solution, clear some walls to create a path
      const modifiedMaze = createPath(newMaze, newStart, newEnd);
      setMaze(modifiedMaze);
      renderMaze(modifiedMaze, newStart, newEnd);
      setSolution([]);
      setHasSolution(true);
    } else {
      setSolution(path);
      setHasSolution(true);
    }
    
    setIsGenerating(false);
  };
  
  // Create a path from start to end if no solution exists
  const createPath = (maze, start, end) => {
    const modifiedMaze = JSON.parse(JSON.stringify(maze));
    
    // Create a simple path from start to end
    let current = { ...start };
    
    while (!(current.x === end.x && current.y === end.y && current.z === end.z)) {
      // Move towards the end in one of the dimensions
      if (current.x < end.x) {
        current.x++;
      } else if (current.x > end.x) {
        current.x--;
      } else if (current.y < end.y) {
        current.y++;
      } else if (current.y > end.y) {
        current.y--;
      } else if (current.z < end.z) {
        current.z++;
      } else if (current.z > end.z) {
        current.z--;
      }
      
      // Ensure the path is clear
      modifiedMaze[current.x][current.y][current.z] = false;
    }
    
    return modifiedMaze;
  };

  // BFS algorithm to solve the maze
  const solveMazeBFS = (maze, start, end) => {
    setIsSolving(true);
    
    // Check if start or end are walls
    if (maze[start.x][start.y][start.z] || maze[end.x][end.y][end.z]) {
      setIsSolving(false);
      setHasSolution(false);
      return null;
    }
    
    const queue = [];
    const visited = new Set();
    const parent = new Map();
    
    // Start BFS from start point
    queue.push(start);
    visited.add(`${start.x},${start.y},${start.z}`);
    
    // Possible directions to move (6 directions in 3D)
    const directions = [
      { x: 1, y: 0, z: 0 },  // Right
      { x: -1, y: 0, z: 0 }, // Left
      { x: 0, y: 1, z: 0 },  // Up
      { x: 0, y: -1, z: 0 }, // Down
      { x: 0, y: 0, z: 1 },  // Forward
      { x: 0, y: 0, z: -1 }  // Backward
    ];
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      // Check if we reached the end
      if (current.x === end.x && current.y === end.y && current.z === end.z) {
        // Reconstruct path
        const path = [];
        let node = current;
        
        while (
          node.x !== start.x || 
          node.y !== start.y || 
          node.z !== start.z
        ) {
          path.unshift(node);
          node = parent.get(`${node.x},${node.y},${node.z}`);
        }
        
        path.unshift(start);
        setIsSolving(false);
        setHasSolution(true);
        return path;
      }
      
      // Check all possible directions
      for (const dir of directions) {
        const next = {
          x: current.x + dir.x,
          y: current.y + dir.y,
          z: current.z + dir.z
        };
        
        // Check if next position is valid
        if (
          next.x >= 0 && next.x < dimensions.x &&
          next.y >= 0 && next.y < dimensions.y &&
          next.z >= 0 && next.z < dimensions.z &&
          !maze[next.x][next.y][next.z] &&
          !visited.has(`${next.x},${next.y},${next.z}`)
        ) {
          queue.push(next);
          visited.add(`${next.x},${next.y},${next.z}`);
          parent.set(`${next.x},${next.y},${next.z}`, current);
        }
      }
    }
    
    // No path found
    setIsSolving(false);
    setHasSolution(false);
    return null;
  };

  // Solve the current maze
  const solveMaze = () => {
    // Clear previous solution
    clearSolution();
    
    // Solve the maze
    const path = solveMazeBFS(maze, startPoint, endPoint);
    
    if (path) {
      setSolution(path);
      renderSolution(path);
      setHasSolution(true);
    } else {
      setSolution([]);
      setHasSolution(false);
    }
  };

  // Render the maze in 3D
  const renderMaze = (maze, start = startPoint, end = endPoint) => {
    // Clear previous maze objects
    clearMazeAndSolution();
    
    const scene = sceneRef.current;
    
    // Create materials with variations for better visual differentiation
    const createWallMaterial = (x, y, z) => {
      // Add slight variations to the color based on position
      const hue = 0.6 + (((x * 13 + y * 17 + z * 19) % 10) / 100);
      const wallColor = new THREE.Color().setHSL(hue, 0.7, 0.5);
      
      return new THREE.MeshStandardMaterial({ 
        color: wallColor,
        roughness: 0.7,
        metalness: 0.2,
        emissive: wallColor.clone().multiplyScalar(0.1)
      });
    };
    
    const startMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x22ff22,
      emissive: 0x00aa00,
      roughness: 0.5,
      metalness: 0.3
    });
    
    const endMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff2222,
      emissive: 0xaa0000,
      roughness: 0.5,
      metalness: 0.3
    });
    
    // Create wall cubes - use size 1.0 to make walls touch
    const wallSize = 1.0;
    const wallGeometry = new THREE.BoxGeometry(wallSize, wallSize, wallSize);
    
    const newMazeObjects = [];
    
    // Center offset to position maze at grid center
    const offsetX = dimensions.x / 2;
    const offsetY = dimensions.y / 2;
    const offsetZ = dimensions.z / 2;
    
    // Add walls
    for (let x = 0; x < dimensions.x; x++) {
      for (let y = 0; y < dimensions.y; y++) {
        for (let z = 0; z < dimensions.z; z++) {
          if (maze[x][y][z]) {
            const cube = new THREE.Mesh(wallGeometry, createWallMaterial(x, y, z));
            cube.position.set(x, y, z);
            // Removed shadow casting for performance
            scene.add(cube);
            newMazeObjects.push(cube);
          }
        }
      }
    }
    
    // Add start point
    const startGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const startSphere = new THREE.Mesh(startGeometry, startMaterial);
    startSphere.position.set(start.x, start.y, start.z);
    scene.add(startSphere);
    newMazeObjects.push(startSphere);
    
    // Add end point
    const endGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const endSphere = new THREE.Mesh(endGeometry, endMaterial);
    endSphere.position.set(end.x, end.y, end.z);
    scene.add(endSphere);
    newMazeObjects.push(endSphere);
    
    // Update camera and controls to center on the maze
    if (controlsRef.current) {
      controlsRef.current.target.set(dimensions.x / 2, dimensions.y / 2, dimensions.z / 2);
      controlsRef.current.update();
    }
    
    mazeObjectsRef.current = newMazeObjects;
  };

  // Render the solution path
  const renderSolution = (path) => {
    // Clear previous solution
    clearSolution();
    
    const scene = sceneRef.current;
    const pathMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffaa22,
      emissive: 0xaa5500,
      roughness: 0.3,
      metalness: 0.8
    });
    
    const sphereGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const cylinderGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    
    const newSolutionObjects = [];
    
    // Draw nodes and connections
    for (let i = 0; i < path.length; i++) {
      // Add node sphere
      const sphere = new THREE.Mesh(sphereGeometry, pathMaterial);
      sphere.position.set(path[i].x, path[i].y, path[i].z);
      scene.add(sphere);
      newSolutionObjects.push(sphere);
      
      // Add connection cylinder to previous node
      if (i > 0) {
        const prev = path[i - 1];
        const curr = path[i];
        
        // Calculate direction and length
        const direction = new THREE.Vector3(
          curr.x - prev.x,
          curr.y - prev.y,
          curr.z - prev.z
        );
        const length = direction.length();
        direction.normalize();
        
        // Create cylinder
        const cylinder = new THREE.Mesh(cylinderGeometry, pathMaterial);
        cylinder.scale.set(1, length, 1);
        
        // Position cylinder between points
        cylinder.position.set(
          (prev.x + curr.x) / 2,
          (prev.y + curr.y) / 2,
          (prev.z + curr.z) / 2
        );
        
        // Orient cylinder
        cylinder.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction
        );
        
        scene.add(cylinder);
        newSolutionObjects.push(cylinder);
      }
    }
    
    solutionObjectsRef.current = newSolutionObjects;
    
    // Toggle visibility based on the showOnlySolution state
    toggleSolutionVisibility();
  };

  // Clear the maze and solution objects
  const clearMazeAndSolution = () => {
    const scene = sceneRef.current;
    
    // Remove maze objects
    mazeObjectsRef.current.forEach(obj => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    mazeObjectsRef.current = [];
    
    // Remove solution objects
    clearSolution();
  };

  // Clear only the solution objects
  const clearSolution = () => {
    const scene = sceneRef.current;
    
    // Remove solution objects
    solutionObjectsRef.current.forEach(obj => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    solutionObjectsRef.current = [];
  };

  // Toggle visibility of maze walls based on showOnlySolution
  const toggleSolutionVisibility = () => {
    // Skip start and end spheres (last two objects)
    const startAndEndObjects = mazeObjectsRef.current.slice(-2);
    const wallObjects = mazeObjectsRef.current.slice(0, -2);
    
    wallObjects.forEach(obj => {
      obj.visible = !showOnlySolution;
    });
    
    // Always show start and end
    startAndEndObjects.forEach(obj => {
      obj.visible = true;
    });
  };

  // Handle dimension changes
  const handleDimensionChange = (dim, value) => {
    const newValue = Math.max(2, Math.min(maxDimension, parseInt(value) || 2));
    setDimensions(prev => ({ ...prev, [dim]: newValue }));
    
    // Update start and end points if they're out of bounds
    setStartPoint(prev => ({
      x: dim === 'x' ? Math.min(prev.x, newValue - 1) : prev.x,
      y: dim === 'y' ? Math.min(prev.y, newValue - 1) : prev.y,
      z: dim === 'z' ? Math.min(prev.z, newValue - 1) : prev.z
    }));
    
    setEndPoint(prev => ({
      x: dim === 'x' ? Math.min(prev.x, newValue - 1) : prev.x,
      y: dim === 'y' ? Math.min(prev.y, newValue - 1) : prev.y,
      z: dim === 'z' ? Math.min(prev.z, newValue - 1) : prev.z
    }));
    
    // Clear the current maze when dimensions change
    setMaze([]);
    clearMazeAndSolution();
    
    // Update camera position
    if (cameraRef.current) {
      cameraRef.current.position.set(
        dimensions.x * 1.5,
        dimensions.y * 1.5,
        dimensions.z * 2
      );
    }
    
    // Update controls target
    if (controlsRef.current) {
      controlsRef.current.target.set(
        newValue / 2, 
        dim === 'y' ? newValue / 2 : dimensions.y / 2,
        dim === 'z' ? newValue / 2 : dimensions.z / 2
      );
    }
  };

  // Handle point changes
  const handlePointChange = (point, dim, value) => {
    const newValue = Math.max(0, Math.min(dimensions[dim] - 1, parseInt(value) || 0));
    if (point === 'start') {
      setStartPoint(prev => ({ ...prev, [dim]: newValue }));
    } else {
      setEndPoint(prev => ({ ...prev, [dim]: newValue }));
    }
  };

  // Effect to update the scene when dimensions change
  useEffect(() => {
    if (sceneRef.current && cameraRef.current) {
      // Update camera position based on new dimensions
      cameraRef.current.position.set(
        dimensions.x * 1.5,
        dimensions.y * 1.5,
        dimensions.z * 2
      );
      
      // Update controls target to center on the maze
      if (controlsRef.current) {
        controlsRef.current.target.set(
          dimensions.x / 2,
          dimensions.y / 2,
          dimensions.z / 2
        );
        controlsRef.current.update();
      }
      
      // Update grid helper
      const scene = sceneRef.current;
      scene.children.forEach(child => {
        if (child instanceof THREE.GridHelper) {
          scene.remove(child);
        }
      });
      
      const gridSize = Math.max(dimensions.x, dimensions.y, dimensions.z) * 2;
      const gridHelper = new THREE.GridHelper(gridSize, 20);
      gridHelper.position.set(dimensions.x / 2, 0, dimensions.z / 2);
      gridHelper.visible = showGrid;
      scene.add(gridHelper);
      
      // If we had a maze, regenerate it to fit the new dimensions
      if (maze.length > 0) {
        clearMazeAndSolution();
      }
    }
  }, [dimensions, showGrid]);

  // Toggle grid visibility
  const toggleGridVisibility = () => {
    setShowGrid(!showGrid);
    
    // Update grid helper visibility
    if (sceneRef.current) {
      sceneRef.current.children.forEach(child => {
        if (child instanceof THREE.GridHelper) {
          child.visible = !showGrid;
        }
      });
    }
  };

  // Effect to update the scene when start/end points change
  useEffect(() => {
    if (maze.length > 0) {
      // Only rerender if the maze has been initialized
      renderMaze(maze);
      setSolution([]);
    }
  }, [startPoint, endPoint]);

  // Effect to handle showOnlySolution toggle
  // Effect to handle showOnlySolution toggle
  useEffect(() => {
    toggleSolutionVisibility();
  }, [showOnlySolution]);
  
  // Effect to automatically generate a maze on first render
  useEffect(() => {
    if (maze.length === 0 && !isGenerating) {
      generateRandomMaze();
    }
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-black">
      {/* Full screen canvas container */}
      <div className="absolute inset-0 w-full h-full" ref={mountRef}>
        {/* Three.js canvas will be mounted here */}
      </div>
      
      {/* Overlay controls - more compact */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-gray-900 bg-opacity-80 p-3 rounded-lg shadow-lg backdrop-blur-sm max-w-xs">
          <h2 className="text-lg text-blue-300 mb-2">3D Maze Solver</h2>
          
          {/* Dimension Controls */}
          <div className="mb-2">
            <h3 className="text-md text-blue-200">Dimensions</h3>
            <div className="grid grid-cols-2 gap-1 mb-1">
              <div className="flex items-center">
                <label className="w-7 text-white text-sm">X:</label>
                <input
                  type="number"
                  min="2"
                  max={maxDimension}
                  value={dimensions.x}
                  onChange={(e) => handleDimensionChange('x', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
              <div className="flex items-center">
                <label className="w-7 text-white text-sm">Y:</label>
                <input
                  type="number"
                  min="2"
                  max={maxDimension}
                  value={dimensions.y}
                  onChange={(e) => handleDimensionChange('y', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="flex items-center">
                <label className="w-7 text-white text-sm">Z:</label>
                <input
                  type="number"
                  min="2"
                  max={maxDimension}
                  value={dimensions.z}
                  onChange={(e) => handleDimensionChange('z', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
              <div className="flex items-center">
                <label className="w-16 text-white text-sm">Max Dim:</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={maxDimension}
                  onChange={(e) => setMaxDimension(Math.max(10, Math.min(100, parseInt(e.target.value) || 50)))}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Start Point Controls */}
          <div className="mb-2">
            <h3 className="text-md text-green-300">Start Point</h3>
            <div className="grid grid-cols-3 gap-1">
              <div className="flex items-center">
                <label className="w-6 text-white text-sm">X:</label>
                <input
                  type="number"
                  min="0"
                  max={dimensions.x - 1}
                  value={startPoint.x}
                  onChange={(e) => handlePointChange('start', 'x', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
              <div className="flex items-center">
                <label className="w-6 text-white text-sm">Y:</label>
                <input
                  type="number"
                  min="0"
                  max={dimensions.y - 1}
                  value={startPoint.y}
                  onChange={(e) => handlePointChange('start', 'y', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
              <div className="flex items-center">
                <label className="w-6 text-white text-sm">Z:</label>
                <input
                  type="number"
                  min="0"
                  max={dimensions.z - 1}
                  value={startPoint.z}
                  onChange={(e) => handlePointChange('start', 'z', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* End Point Controls */}
          <div className="mb-2">
            <h3 className="text-md text-red-300">End Point</h3>
            <div className="grid grid-cols-3 gap-1">
              <div className="flex items-center">
                <label className="w-6 text-white text-sm">X:</label>
                <input
                  type="number"
                  min="0"
                  max={dimensions.x - 1}
                  value={endPoint.x}
                  onChange={(e) => handlePointChange('end', 'x', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
              <div className="flex items-center">
                <label className="w-6 text-white text-sm">Y:</label>
                <input
                  type="number"
                  min="0"
                  max={dimensions.y - 1}
                  value={endPoint.y}
                  onChange={(e) => handlePointChange('end', 'y', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
              <div className="flex items-center">
                <label className="w-6 text-white text-sm">Z:</label>
                <input
                  type="number"
                  min="0"
                  max={dimensions.z - 1}
                  value={endPoint.z}
                  onChange={(e) => handlePointChange('end', 'z', e.target.value)}
                  className="w-full bg-gray-700 text-white rounded p-1 text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-1 mb-2">
            <button
              onClick={generateRandomMaze}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded disabled:opacity-50 text-sm"
            >
              {isGenerating ? 'Generating...' : 'Generate Random Maze'}
            </button>
            
            <button
              onClick={solveMaze}
              disabled={isSolving || maze.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded disabled:opacity-50 text-sm"
            >
              {isSolving ? 'Solving...' : 'Solve Maze'}
            </button>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show-only-solution"
                  checked={showOnlySolution}
                  onChange={() => setShowOnlySolution(!showOnlySolution)}
                  className="h-3 w-3 mr-1"
                />
                <label htmlFor="show-only-solution" className="text-white text-xs">Show only solution</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show-grid"
                  checked={showGrid}
                  onChange={toggleGridVisibility}
                  className="h-3 w-3 mr-1"
                />
                <label htmlFor="show-grid" className="text-white text-xs">Show grid</label>
              </div>
            </div>
          </div>
          
          {/* Status */}
          <div>
            {solution.length > 0 && (
              <p className="text-green-400 text-sm">
                Solution found! Length: {solution.length} steps
              </p>
            )}
            {solution.length === 0 && maze.length > 0 && !hasSolution && (
              <p className="text-red-400 text-sm">
                No solution exists
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Title overlay in top-center */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <h1 className="text-xl text-blue-400 font-bold bg-gray-900 bg-opacity-80 px-4 py-1 rounded-lg backdrop-blur-sm">
          3D Maze Solver with BFS
        </h1>
      </div>
      
      {/* Instructions overlay at bottom */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <p className="text-white text-sm bg-gray-900 bg-opacity-80 px-3 py-1 rounded-lg backdrop-blur-sm">
          Use mouse to rotate, zoom and pan the 3D maze
        </p>
      </div>
    </div>
  );
};

export default MazeSolver3D;