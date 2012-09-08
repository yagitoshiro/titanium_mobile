import os, sys, platform, subprocess

root = os.path.abspath(os.path.join(os.path.dirname(sys._getframe(0).f_code.co_filename), ".."))

lib_dir = os.path.join(root, 'android', 'build', 'lib')
ant_classpath = [
	os.path.join(lib_dir, 'ant.jar'),
	os.path.join(lib_dir, 'ant-launcher.jar'),
	os.path.join(lib_dir, 'xercesImpl.jar'),
	os.path.join(lib_dir, 'xml-apis.jar'),
	os.path.join(lib_dir, 'ant-nodeps.jar')
]

# In Darwin, ant launcher class (in the ant-launcher.jar) won't successfully find
# javac for JDK 1.7.  Give it a helping hand.
if (platform.system() == 'Darwin' and "JAVA_HOME" not in os.environ and
		os.path.exists("/usr/libexec/java_home")):
	p = subprocess.Popen(["/usr/libexec/java_home"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
	(sout, serr) = p.communicate()
	sout = sout.strip()
	if os.path.exists(sout):
		ant_classpath.append(os.path.join(sout, "lib", "tools.jar"))

jdk_jar_added = False
def get_java():
	global jdk_jar_added
	java = 'java'
	if platform.system() != 'Darwin':
		# oh windows, we hate you so
		if 'JAVA_HOME' in os.environ:
			java_exec = 'java'
			if platform.system() == 'Windows': java_exec = 'java.exe'
			java = os.path.join(os.environ['JAVA_HOME'], 'bin', java_exec)
			if not jdk_jar_added:
				ant_classpath.append(os.path.join(os.environ['JAVA_HOME'], 'lib', 'tools.jar'))
				jdk_jar_added = True
	return java

def build(script='build.xml', targets=None, properties={}, basedir=None):
	if basedir == None:
		basedir = os.path.dirname(os.path.abspath(script))

	ant_cmd = [get_java(), '-cp', os.pathsep.join(ant_classpath),
		'org.apache.tools.ant.launch.Launcher', '-Dant.home=build']

	for property in properties.keys():
		ant_cmd.append('-D%s=%s' % (property, properties[property]))

	ant_cmd.extend(['-buildfile', script])
	if targets != None:
		ant_cmd.extend(targets)
	
	print " ".join(ant_cmd)

	ret = subprocess.Popen(ant_cmd, shell=False, cwd=basedir).wait()
	if ret:
		sys.exit(ret)

# a simplified .properties file parser
def read_properties(file):
	properties = {}
	for line in file.read().splitlines():
		line = line.strip()
		if len(line) > 0 and line[0] == '#': continue
		if len(line) == 0 or '=' not in line: continue

		key, value = line.split('=', 1)
		properties[key.strip()] = value.strip().replace('\\\\', '\\')
	return properties
