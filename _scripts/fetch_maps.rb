require 'net/http'
require 'json'
require 'uri'
require 'fileutils'

TOKEN    = ENV['MAPS_GITHUB_TOKEN']
RAW_BASE = 'https://raw.githubusercontent.com/BF3RM/RealityMod/development'
API_BASE = 'https://api.github.com/repos/BF3RM/RealityMod/contents'
MODES    = %w[AAS INS SKR]

def fetch(url)
  uri = URI(url)
  req = Net::HTTP::Get.new(uri)
  req['Authorization'] = "Bearer #{TOKEN}"
  req['User-Agent']    = 'landing-site'
  res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |h| h.request(req) }
  res.code.to_i == 200 ? res.body : nil
end

def ys(s)
  s.to_s.gsub('"', '\\"')
end

# ── Vehicle definitions lookup ───────────────────────────────────────────────
puts 'Fetching VehicleDefinitions...'
vd_lua = fetch("#{RAW_BASE}/ext/Shared/Vehicles/Definitions/VehicleDefinitions.lua")
vehicle_defs = {}
vd_lua.scan(/^\t(\w+)\s*=\s*\{(.*?)^\t\}/m) do |vname, vblock|
  vblock.scan(/^\t\t(\w+)\s*=\s*\{(.*?)^\t\t\}/m) do |variant, vvarblock|
    m = vvarblock.match(/displayName\s*=\s*"([^"]+)"/)
    vehicle_defs["#{vname}.#{variant}"] = m[1] if m
  end
end
puts "  #{vehicle_defs.size} vehicle variants loaded"

# ── Spawn timer lookup ───────────────────────────────────────────────────────
puts 'Fetching VehicleSpawnTimers...'
timers_lua = fetch("#{RAW_BASE}/ext/Shared/Config/Vehicles/VehicleSpawnTimers.lua")
timers = {}
timers_lua.scan(/^\t(\w+)\s*=\s*\{(.*?)^\t\}/m) do |category, cblock|
  cblock.scan(/^\t\t(\w+)\s*=\s*\{(.*?)^\t\t\}/m) do |gamemode, gmblock|
    gmblock.scan(/(\w+)\s*=\s*(\d+)/) do |field, val|
      timers["#{category}.#{gamemode}.#{field}"] = val.to_i
    end
  end
end
puts "  #{timers.size} timer entries loaded"

# ── Flags ────────────────────────────────────────────────────────────────────
puts 'Fetching flags...'
FileUtils.mkdir_p('assets/img/flags')
%w[usmc ru ins mec pla uk bw idf neutral].each do |icon|
  svg = fetch("#{RAW_BASE}/WebUI/src/assets/svg/flags/icn-flag-#{icon}.svg")
  File.write("assets/img/flags/#{icon}.svg", svg) if svg
end

# ── Helpers ──────────────────────────────────────────────────────────────────

def resolve_delay(ref, timers)
  return ref.to_i if ref =~ /^\d+$/
  key = ref.sub('RM_VEHICLE_SPAWN_TIMERS.', '')
  timers[key] || 0
end

def extract_block_at(lua, start_idx)
  open = lua.index('{', start_idx)
  return '' unless open
  depth = 1
  pos = open + 1
  while pos < lua.length && depth > 0
    case lua[pos]
    when '{' then depth += 1
    when '}' then depth -= 1
    end
    pos += 1
  end
  lua[(open + 1)...(pos - 1)]
end

def extract_sub_blocks(block)
  results = []
  pos = 0
  while pos < block.length
    open = block.index('{', pos)
    break unless open
    depth = 1
    i = open + 1
    while i < block.length && depth > 0
      case block[i]
      when '{' then depth += 1
      when '}' then depth -= 1
      end
      i += 1
    end
    results << block[(open + 1)...(i - 1)]
    pos = i
  end
  results
end

def parse_team(lua, team_id)
  teams_idx = lua.index(/\bteams\s*=\s*\{/)
  return nil unless teams_idx
  marker = "[TeamId.#{team_id}]"
  idx = lua.index(marker, teams_idx)
  return nil unless idx
  block = extract_block_at(lua, idx)
  return nil if block.nil? || block.empty?
  {
    name:  block.match(/\bname\s*=\s*["']([^"']+)["']/)&.[](1),
    short: block.match(/\bshort\s*=\s*["']([^"']+)["']/)&.[](1),
    icon:  block.match(/\bicon\s*=\s*["']([^"']+)["']/)&.[](1)
  }
end

def parse_boundaries(lua, team_id)
  b_idx = lua.index('boundaries')
  return [] unless b_idx
  marker = team_id == 'Neutral' ? '[TeamId.TeamNeutral]' : "[TeamId.#{team_id}]"
  team_idx = lua.index(marker, b_idx)
  return [] unless team_idx
  block = extract_block_at(lua, team_idx)
  block.scan(/Vec2\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/).map { |x, z| [x.to_f.round(2), z.to_f.round(2)] }
end

def parse_spawn_points(lua, team_id)
  sp_idx = lua.index('spawnPoints')
  return [] unless sp_idx
  team_marker = "[TeamId.#{team_id}]"
  team_idx = lua.index(team_marker, sp_idx)
  return [] unless team_idx
  team_block = extract_block_at(lua, team_idx)

  extract_sub_blocks(team_block).filter_map do |sub|
    name_m = sub.match(/name\s*=\s*["']([^"']+)["']/)
    pos_m  = sub.match(/Vec3\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/)
    next unless name_m && pos_m
    { name: name_m[1], x: pos_m[1].to_f.round(2), z: pos_m[3].to_f.round(2) }
  end
end

def parse_cache_count(lua)
  m = lua.match(/cacheCount\s*=\s*(\d+)/)
  m ? m[1].to_i : nil
end

def parse_tickets(lua, team_id)
  idx = lua.index('tickets')
  return nil unless idx
  block = extract_block_at(lua, idx)
  m = block.match(/\[TeamId\.#{team_id}\]\s*=\s*(\d+)/)
  m ? m[1].to_i : nil
end

def parse_minimap_info(lua)
  idx = lua.index('minimapInfo')
  return nil unless idx
  block = extract_block_at(lua, idx)
  center_m = block.match(/center\s*=\s*Vec2\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/)
  width_m  = block.match(/width\s*=\s*(\d+)/)
  return nil unless center_m && width_m
  { cx: center_m[1].to_f, cz: center_m[2].to_f, width: width_m[1].to_i }
end

def parse_vehicles(lua, vehicle_defs, timers)
  vehicles = []
  search = 0
  while (vs_pos = lua.index('VehicleSpawnDefinition', search))
    open = lua.index('{', vs_pos)
    break unless open
    depth = 1
    pos = open + 1
    while pos < lua.length && depth > 0
      case lua[pos]
      when '{' then depth += 1
      when '}' then depth -= 1
      end
      pos += 1
    end
    block = lua[(open + 1)...(pos - 1)]

    type_m = block.match(/type\s*=\s*Vehicles\.(\w+)\.(\w+)/)
    if type_m
      vkey = "#{type_m[1]}.#{type_m[2]}"
      display_name = vehicle_defs[vkey] || vkey.gsub('.', ' ')
      team = block.match(/teamId\s*=\s*TeamId\.Team(\d)/)&.[](1).to_i
      init_ref = block.match(/initialSpawnDelay\s*=\s*([\w.]+)/)&.[](1) || '0'
      resp_ref = block.match(/respawnDelay\s*=\s*([\w.]+)/)&.[](1) || '0'
      vehicles << {
        displayName:       display_name,
        team:              team,
        initialSpawnDelay: resolve_delay(init_ref, timers),
        respawnDelay:      resolve_delay(resp_ref, timers)
      }
    end
    search = pos
  end
  vehicles
end

# ── Main ─────────────────────────────────────────────────────────────────────
folders = JSON.parse(fetch("#{API_BASE}/ext/Shared/Maps/MapDefinitions?ref=development"))
yaml = ''

folders.each do |folder|
  map_name = folder['name']
  lua = fetch("#{RAW_BASE}/ext/Shared/Maps/MapDefinitions/#{map_name}/#{map_name}.lua")

  next unless lua.match?(/active\s*=\s*true/)
  display_name = lua.match(/displayName\s*=\s*'([^']+)'/)&.[](1)
  next unless display_name

  minimap = parse_minimap_info(lua)

  game_modes = MODES.filter_map do |mode|
    mode_lua = fetch("#{RAW_BASE}/ext/Shared/Maps/MapDefinitions/#{map_name}/GameModes/Standard/#{mode}.lua")
    next if mode_lua.nil?

    version   = mode_lua.match(/version\s*=\s*["']([^"']+)["']/)&.[](1)
    full_name = mode_lua.match(/fullName\s*=\s*'([^']+)'/)&.[](1)
    next unless version && full_name

    mode_minimap = parse_minimap_info(mode_lua)

    {
      name: mode, fullName: full_name, version: version,
      tickets1:     parse_tickets(mode_lua, 'Team1'),
      tickets2:     parse_tickets(mode_lua, 'Team2'),
      cacheCount:   (mode == 'INS' ? parse_cache_count(mode_lua) : nil),
      minimapCx:    mode_minimap&.dig(:cx),
      minimapCz:    mode_minimap&.dig(:cz),
      minimapWidth: mode_minimap&.dig(:width),
      team1:        parse_team(mode_lua, 'Team1'),
      team2:        parse_team(mode_lua, 'Team2'),
      spawnPoints1:  parse_spawn_points(mode_lua, 'Team1'),
      spawnPoints2:  parse_spawn_points(mode_lua, 'Team2'),
      boundaries1:   parse_boundaries(mode_lua, 'Team1'),
      boundaries2:   parse_boundaries(mode_lua, 'Team2'),
      boundariesN:   parse_boundaries(mode_lua, 'Neutral'),
      vehicles:     parse_vehicles(mode_lua, vehicle_defs, timers)
    }
  end

  next if game_modes.empty?

  yaml += "- name: #{map_name}\n"
  yaml += "  displayName: \"#{ys(display_name)}\"\n"
  if minimap
    yaml += "  minimapCx: #{minimap[:cx]}\n"
    yaml += "  minimapCz: #{minimap[:cz]}\n"
    yaml += "  minimapWidth: #{minimap[:width]}\n"
  end
  yaml += "  gameModes:\n"

  game_modes.each do |gm|
    yaml += "    - name: #{gm[:name]}\n"
    yaml += "      fullName: \"#{ys(gm[:fullName])}\"\n"
    yaml += "      version: #{gm[:version]}\n"
    yaml += "      tickets1: #{gm[:tickets1]}\n" if gm[:tickets1]
    yaml += "      tickets2: #{gm[:tickets2]}\n" if gm[:tickets2]
    yaml += "      cacheCount: #{gm[:cacheCount]}\n" if gm[:cacheCount]
    yaml += "      minimapCx: #{gm[:minimapCx]}\n" if gm[:minimapCx]
    yaml += "      minimapCz: #{gm[:minimapCz]}\n" if gm[:minimapCz]
    yaml += "      minimapWidth: #{gm[:minimapWidth]}\n" if gm[:minimapWidth]

    %i[team1 team2].each do |tk|
      t = gm[tk]
      next unless t && t[:name]
      yaml += "      #{tk}:\n"
      yaml += "        name: \"#{ys(t[:name])}\"\n"
      yaml += "        short: \"#{ys(t[:short])}\"\n"
      yaml += "        icon: #{t[:icon]}\n"
    end

    %i[spawnPoints1 spawnPoints2].each do |sk|
      pts = gm[sk]
      next if pts.nil? || pts.empty?
      yaml += "      #{sk}:\n"
      pts.each do |sp|
        yaml += "        - name: \"#{ys(sp[:name])}\"\n"
        yaml += "          x: #{sp[:x]}\n"
        yaml += "          z: #{sp[:z]}\n"
      end
    end

    %i[boundaries1 boundaries2 boundariesN].each do |bk|
      pts = gm[bk]
      next if pts.nil? || pts.empty?
      yaml += "      #{bk}:\n"
      pts.each { |pt| yaml += "        - [#{pt[0]}, #{pt[1]}]\n" }
    end

    if gm[:vehicles]&.any?
      yaml += "      vehicles:\n"
      gm[:vehicles].each do |v|
        yaml += "        - displayName: \"#{ys(v[:displayName])}\"\n"
        yaml += "          team: #{v[:team]}\n"
        yaml += "          initialSpawnDelay: #{v[:initialSpawnDelay]}\n"
        yaml += "          respawnDelay: #{v[:respawnDelay]}\n"
      end
    end
  end

  puts "OK: #{map_name} (#{display_name})"
end

File.write('_data/maps.yml', yaml)
puts "Done — #{yaml.lines.grep(/^- name/).count} maps written to _data/maps.yml"
