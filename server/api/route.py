"""Healthiest-route vs shortest-route API route."""

import networkx as nx
import osmnx as ox
from fastapi import APIRouter, Depends, HTTPException

from .firebase_auth import get_current_user

from .schemas import RouteRequest, RouteResponse, RouteDetail

router = APIRouter()


def _geocode(location: str) -> tuple[float, float]:
    """Geocode a location string to (latitude, longitude)."""
    try:
        coords = ox.geocode(location)
        return coords  # (lat, lng)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not geocode location '{location}': {str(e)}",
        )


def _get_route_coords(graph, route_nodes) -> list[list[float]]:
    """Convert a list of node IDs to [[lat, lng], ...] coordinate pairs."""
    coords = []
    for node in route_nodes:
        data = graph.nodes[node]
        coords.append([data["y"], data["x"]])  # lat, lng
    return coords


def _compute_route_distance(graph, route_nodes) -> float:
    """Compute the total distance (in km) along a route."""
    total = 0.0
    for i in range(len(route_nodes) - 1):
        edge_data = graph.get_edge_data(route_nodes[i], route_nodes[i + 1])
        if edge_data:
            # MultiDiGraph: pick the first edge
            first_key = list(edge_data.keys())[0]
            total += edge_data[first_key].get("length", 0.0)
    return round(total / 1000.0, 3)  # metres → km


def _apply_health_weights(graph) -> nx.MultiDiGraph:
    """
    Copy the graph and modify edge weights to penalise high-traffic roads
    and reward residential/service roads.
    """
    g = graph.copy()

    penalty_map = {
        "motorway": 5.0,
        "motorway_link": 5.0,
        "trunk": 4.0,
        "trunk_link": 4.0,
        "primary": 3.0,
        "primary_link": 3.0,
        "secondary": 1.5,
        "secondary_link": 1.5,
    }
    reward_map = {
        "residential": 0.7,
        "service": 0.7,
        "living_street": 0.7,
        "pedestrian": 0.5,
        "footway": 0.5,
        "cycleway": 0.5,
        "path": 0.6,
    }

    for u, v, key, data in g.edges(keys=True, data=True):
        length = data.get("length", 0.0)
        highway = data.get("highway", "")
        # highway can be a list
        if isinstance(highway, list):
            highway = highway[0]

        multiplier = penalty_map.get(highway, reward_map.get(highway, 1.0))
        g[u][v][key]["health_weight"] = length * multiplier

    return g


# ─── Route ──────────────────────────────────────────────────────────────────────

@router.post("/api/route", response_model=RouteResponse)
async def compute_route(request: RouteRequest, user: dict = Depends(get_current_user)):
    """Compute shortest and healthiest routes between two locations."""
    try:
        start_lat, start_lng = _geocode(request.start_location)
        end_lat, end_lng = _geocode(request.end_location)

        # Centre point and radius for the road network
        center_lat = (start_lat + end_lat) / 2
        center_lng = (start_lng + end_lng) / 2
        radius_m = request.search_radius_km * 1000

        # Download the road network
        try:
            graph = ox.graph_from_point(
                (center_lat, center_lng),
                dist=radius_m,
                network_type="drive",
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load road network: {str(e)}",
            )

        # Snap start/end to the nearest graph nodes
        start_node = ox.nearest_nodes(graph, start_lng, start_lat)
        end_node = ox.nearest_nodes(graph, end_lng, end_lat)

        # Shortest path (by length)
        try:
            shortest_nodes = nx.shortest_path(
                graph, start_node, end_node, weight="length"
            )
        except nx.NetworkXNoPath:
            raise HTTPException(
                status_code=404,
                detail="No route found between the given locations.",
            )

        shortest_coords = _get_route_coords(graph, shortest_nodes)
        shortest_dist = _compute_route_distance(graph, shortest_nodes)

        # Healthiest path (penalised / rewarded weights)
        health_graph = _apply_health_weights(graph)
        try:
            healthiest_nodes = nx.shortest_path(
                health_graph, start_node, end_node, weight="health_weight"
            )
        except nx.NetworkXNoPath:
            # Fallback to shortest if no healthy route exists
            healthiest_nodes = shortest_nodes

        healthiest_coords = _get_route_coords(graph, healthiest_nodes)
        healthiest_dist = _compute_route_distance(graph, healthiest_nodes)

        return RouteResponse(
            shortest_route=RouteDetail(
                coords=shortest_coords, distance_km=shortest_dist
            ),
            healthiest_route=RouteDetail(
                coords=healthiest_coords, distance_km=healthiest_dist
            ),
            start_coords=[start_lat, start_lng],
            end_coords=[end_lat, end_lng],
            center_coords=[center_lat, center_lng],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Route computation failed: {str(e)}",
        )
